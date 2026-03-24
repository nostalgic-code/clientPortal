from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.user import User
from models.client import Client
from models.project import Project
from models.phase import Phase
from models.milestone import Milestone, MilestoneAction
from models.organization import OrganizationUser

milestones_bp = Blueprint('milestones', __name__)

def get_user_organization_id(user_id):
    org_user = OrganizationUser.query.filter_by(user_id=user_id).first()
    return org_user.organization_id if org_user else None

@milestones_bp.route('/phase/<int:phase_id>', methods=['GET'])
@jwt_required()
def get_phase_milestones(phase_id):
    """Get all milestones for a phase."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    org_id = get_user_organization_id(current_user_id)
    
    phase = Phase.query.get(phase_id)
    if not phase:
        return jsonify({'error': 'Phase not found'}), 404
    
    project = Project.query.get(phase.project_id)
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    if user.role == 'client':
        client = Client.query.filter_by(user_id=user.id).first()
        if not client or project.client_id != client.id:
            return jsonify({'error': 'Access denied'}), 403
    
    milestones = phase.milestones.order_by(Milestone.order_index).all()
    
    return jsonify({
        'milestones': [m.to_dict(include_actions=True) for m in milestones]
    }), 200


@milestones_bp.route('/<int:milestone_id>', methods=['GET'])
@jwt_required()
def get_milestone(milestone_id):
    """Get a specific milestone."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    org_id = get_user_organization_id(current_user_id)
    
    milestone = Milestone.query.get(milestone_id)
    if not milestone:
        return jsonify({'error': 'Milestone not found'}), 404
    
    phase = Phase.query.get(milestone.phase_id)
    project = Project.query.get(phase.project_id)
    
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    if user.role == 'client':
        client = Client.query.filter_by(user_id=user.id).first()
        if not client or project.client_id != client.id:
            return jsonify({'error': 'Access denied'}), 403
    
    return jsonify({'milestone': milestone.to_dict(include_actions=True)}), 200


@milestones_bp.route('/phase/<int:phase_id>', methods=['POST'])
@jwt_required()
def create_milestone(phase_id):
    """Create a new milestone for a phase."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(current_user_id)
    
    phase = Phase.query.get(phase_id)
    if not phase:
        return jsonify({'error': 'Phase not found'}), 404
    
    project = Project.query.get(phase.project_id)
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    if not data.get('title'):
        return jsonify({'error': 'title is required'}), 400
    
    # Get next order index
    last_milestone = phase.milestones.order_by(Milestone.order_index.desc()).first()
    next_order = (last_milestone.order_index + 1) if last_milestone else 0
    
    milestone = Milestone(
        phase_id=phase.id,
        title=data['title'],
        description=data.get('description'),
        order_index=data.get('order_index', next_order),
        status='locked'
    )
    
    db.session.add(milestone)
    db.session.commit()
    
    return jsonify({'milestone': milestone.to_dict()}), 201


@milestones_bp.route('/<int:milestone_id>', methods=['PUT'])
@jwt_required()
def update_milestone(milestone_id):
    """Update a milestone."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(current_user_id)
    
    milestone = Milestone.query.get(milestone_id)
    if not milestone:
        return jsonify({'error': 'Milestone not found'}), 404
    
    phase = Phase.query.get(milestone.phase_id)
    project = Project.query.get(phase.project_id)
    
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    if 'title' in data:
        milestone.title = data['title']
    if 'description' in data:
        milestone.description = data['description']
    if 'order_index' in data:
        milestone.order_index = data['order_index']
    
    db.session.commit()
    
    return jsonify({'milestone': milestone.to_dict(include_actions=True)}), 200


@milestones_bp.route('/<int:milestone_id>/actions', methods=['POST'])
@jwt_required()
def create_action(milestone_id):
    """Create a new action for a milestone."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(current_user_id)
    
    milestone = Milestone.query.get(milestone_id)
    if not milestone:
        return jsonify({'error': 'Milestone not found'}), 404
    
    phase = Phase.query.get(milestone.phase_id)
    project = Project.query.get(phase.project_id)
    
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    required_fields = ['type', 'title']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    valid_types = ['upload', 'sign', 'approve', 'schedule', 'pay']
    if data['type'] not in valid_types:
        return jsonify({'error': f'Invalid type. Must be one of: {valid_types}'}), 400
    
    action = MilestoneAction(
        milestone_id=milestone.id,
        type=data['type'],
        title=data['title'],
        description=data.get('description'),
        status='pending'
    )
    
    if data.get('requirements'):
        action.set_requirements(data['requirements'])
    
    db.session.add(action)
    db.session.commit()
    
    return jsonify({'action': action.to_dict()}), 201


@milestones_bp.route('/actions/<int:action_id>/complete', methods=['POST'])
@jwt_required()
def complete_action(action_id):
    """Complete a milestone action."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    org_id = get_user_organization_id(current_user_id)
    
    action = MilestoneAction.query.get(action_id)
    if not action:
        return jsonify({'error': 'Action not found'}), 404
    
    milestone = Milestone.query.get(action.milestone_id)
    phase = Phase.query.get(milestone.phase_id)
    project = Project.query.get(phase.project_id)
    
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    # Clients can only complete actions on their own projects
    if user.role == 'client':
        client = Client.query.filter_by(user_id=user.id).first()
        if not client or project.client_id != client.id:
            return jsonify({'error': 'Access denied'}), 403
    
    # Verify milestone is active
    if milestone.status != 'active':
        return jsonify({'error': 'Milestone is not active'}), 400
    
    if action.status == 'complete':
        return jsonify({'error': 'Action already completed'}), 400
    
    action.complete()
    db.session.commit()
    
    # Return updated state
    return jsonify({
        'action': action.to_dict(),
        'milestone': milestone.to_dict(include_actions=True),
        'phase_status': phase.status,
        'project_status': project.status
    }), 200
