from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import re
from extensions import db
from models.user import User
from models.client import Client
from models.template import Template
from models.proposal import Proposal
from models.project import Project
from models.phase import Phase
from models.milestone import Milestone, MilestoneAction
from models.organization import OrganizationUser

proposals_bp = Blueprint('proposals', __name__)

def get_user_organization_id(user_id):
    org_user = OrganizationUser.query.filter_by(user_id=user_id).first()
    return org_user.organization_id if org_user else None

def resolve_template_content(content, variables):
    """Replace template variables with actual values."""
    resolved = content
    for key, value in variables.items():
        pattern = r'\{\{\s*' + re.escape(key) + r'\s*\}\}'
        resolved = re.sub(pattern, str(value), resolved)
    return resolved

@proposals_bp.route('/', methods=['GET'])
@jwt_required()
def get_proposals():
    """Get all proposals for the organization."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(current_user_id)
    if not org_id:
        return jsonify({'error': 'Organization not found'}), 404
    
    # Get proposals for clients in this organization
    client_ids = [c.id for c in Client.query.filter_by(organization_id=org_id).all()]
    
    status = request.args.get('status')
    query = Proposal.query.filter(Proposal.client_id.in_(client_ids))
    
    if status:
        query = query.filter_by(status=status)
    
    proposals = query.order_by(Proposal.created_at.desc()).all()
    
    result = []
    for p in proposals:
        data = p.to_dict()
        data['client'] = p.client.to_dict()
        data['template'] = p.template.to_dict() if p.template else None
        result.append(data)
    
    return jsonify({'proposals': result}), 200


@proposals_bp.route('/<int:proposal_id>', methods=['GET'])
@jwt_required()
def get_proposal(proposal_id):
    """Get a specific proposal."""
    current_user_id = get_jwt_identity()
    org_id = get_user_organization_id(current_user_id)
    
    proposal = Proposal.query.get(proposal_id)
    if not proposal or proposal.client.organization_id != org_id:
        return jsonify({'error': 'Proposal not found'}), 404
    
    data = proposal.to_dict()
    data['client'] = proposal.client.to_dict()
    data['template'] = proposal.template.to_dict() if proposal.template else None
    
    return jsonify({'proposal': data}), 200


@proposals_bp.route('/public/<token>', methods=['GET'])
def get_public_proposal(token):
    """Get a proposal by public token (no auth required)."""
    proposal = Proposal.query.filter_by(public_token=token).first()
    
    if not proposal or proposal.status not in ['sent', 'accepted', 'rejected']:
        return jsonify({'error': 'Proposal not found'}), 404
    
    return jsonify({
        'proposal': {
            'id': proposal.id,
            'status': proposal.status,
            'resolved_content': proposal.resolved_content,
            'total_amount': proposal.total_amount,
            'client_name': proposal.client.name
        }
    }), 200


@proposals_bp.route('/', methods=['POST'])
@jwt_required()
def create_proposal():
    """Create a new proposal."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.get_json()
    
    required_fields = ['client_id', 'template_id']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    # Validate client
    client = Client.query.get(data['client_id'])
    if not client:
        return jsonify({'error': 'Client not found'}), 404
    
    # Validate template
    template = Template.query.get(data['template_id'])
    if not template or template.type != 'proposal':
        return jsonify({'error': 'Valid proposal template required'}), 400
    
    # Get template version
    version_number = data.get('template_version')
    if version_number:
        version = template.versions.filter_by(version_number=version_number).first()
    else:
        version = template.get_latest_version()
    
    if not version:
        return jsonify({'error': 'Template version not found'}), 404
    
    # Resolve content with variables
    variables = data.get('variables', {})
    # Add default variables
    variables.setdefault('client_name', client.name)
    resolved_content = resolve_template_content(version.content, variables)
    
    proposal = Proposal(
        client_id=client.id,
        template_id=template.id,
        template_version=version.version_number,
        status='draft',
        resolved_content=resolved_content,
        total_amount=data.get('total_amount')
    )
    
    db.session.add(proposal)
    db.session.commit()
    
    return jsonify({'proposal': proposal.to_dict()}), 201


@proposals_bp.route('/<int:proposal_id>', methods=['PUT'])
@jwt_required()
def update_proposal(proposal_id):
    """Update a proposal (only if draft)."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(current_user_id)
    
    proposal = Proposal.query.get(proposal_id)
    if not proposal or proposal.client.organization_id != org_id:
        return jsonify({'error': 'Proposal not found'}), 404
    
    if proposal.status != 'draft':
        return jsonify({'error': 'Can only update draft proposals'}), 400
    
    data = request.get_json()
    
    if 'resolved_content' in data:
        proposal.resolved_content = data['resolved_content']
    if 'total_amount' in data:
        proposal.total_amount = data['total_amount']
    
    db.session.commit()
    
    return jsonify({'proposal': proposal.to_dict()}), 200


@proposals_bp.route('/<int:proposal_id>/send', methods=['POST'])
@jwt_required()
def send_proposal(proposal_id):
    """Send a proposal to client (generates public link)."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(current_user_id)
    
    proposal = Proposal.query.get(proposal_id)
    if not proposal or proposal.client.organization_id != org_id:
        return jsonify({'error': 'Proposal not found'}), 404
    
    if proposal.status != 'draft':
        return jsonify({'error': 'Proposal already sent'}), 400
    
    # Generate public token and lock proposal
    proposal.generate_public_token()
    proposal.status = 'sent'
    proposal.sent_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'proposal': proposal.to_dict(),
        'public_url': f'/proposal/{proposal.public_token}'
    }), 200


@proposals_bp.route('/public/<token>/respond', methods=['POST'])
def respond_to_proposal(token):
    """Accept or reject a proposal (client action)."""
    proposal = Proposal.query.filter_by(public_token=token).first()
    
    if not proposal or proposal.status != 'sent':
        return jsonify({'error': 'Proposal not found or already responded'}), 404
    
    data = request.get_json()
    action = data.get('action')  # 'accept' or 'reject'
    
    if action not in ['accept', 'reject']:
        return jsonify({'error': 'Invalid action. Must be accept or reject'}), 400
    
    proposal.responded_at = datetime.utcnow()
    
    if action == 'reject':
        proposal.status = 'rejected'
        db.session.commit()
        return jsonify({'message': 'Proposal rejected', 'proposal': proposal.to_dict()}), 200
    
    # ACCEPT - This triggers the project creation flow
    proposal.status = 'accepted'
    
    # Update client status
    client = proposal.client
    client.status = 'active'
    
    # Create project
    project = Project(
        organization_id=client.organization_id,
        client_id=client.id,
        proposal_id=proposal.id,
        name=f"Project for {client.name}",
        status='active'
    )
    db.session.add(project)
    db.session.flush()
    
    # Create Onboarding phase
    onboarding_phase = Phase(
        project_id=project.id,
        name='Onboarding',
        order_index=0,
        status='active'
    )
    db.session.add(onboarding_phase)
    db.session.flush()
    
    # Create onboarding milestones
    milestones_config = [
        {
            'title': 'Agreement Signing',
            'description': 'Sign the service agreement',
            'order_index': 0,
            'actions': [{'type': 'sign', 'title': 'Sign Agreement'}]
        },
        {
            'title': 'Invoice Payment',
            'description': 'Pay the initial invoice',
            'order_index': 1,
            'actions': [{'type': 'pay', 'title': 'Pay Invoice'}]
        },
        {
            'title': 'Resource Upload',
            'description': 'Upload required resources',
            'order_index': 2,
            'actions': [{'type': 'upload', 'title': 'Upload Resources'}]
        }
    ]
    
    for i, config in enumerate(milestones_config):
        milestone = Milestone(
            phase_id=onboarding_phase.id,
            title=config['title'],
            description=config['description'],
            order_index=config['order_index'],
            status='active' if i == 0 else 'locked'
        )
        db.session.add(milestone)
        db.session.flush()
        
        for action_config in config['actions']:
            action = MilestoneAction(
                milestone_id=milestone.id,
                type=action_config['type'],
                title=action_config['title'],
                status='pending'
            )
            db.session.add(action)
    
    # Create Strategy phase (locked)
    strategy_phase = Phase(
        project_id=project.id,
        name='Strategy',
        order_index=1,
        status='locked'
    )
    db.session.add(strategy_phase)
    
    # Create Fulfilment phase (locked)
    fulfilment_phase = Phase(
        project_id=project.id,
        name='Fulfilment',
        order_index=2,
        status='locked'
    )
    db.session.add(fulfilment_phase)
    
    # Create Reporting phase (locked)
    reporting_phase = Phase(
        project_id=project.id,
        name='Reporting',
        order_index=3,
        status='locked'
    )
    db.session.add(reporting_phase)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Proposal accepted',
        'proposal': proposal.to_dict(),
        'project': project.to_dict(include_phases=True)
    }), 200
