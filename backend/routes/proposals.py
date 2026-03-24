from flask import Blueprint, request, jsonify
from routes.auth import supabase_auth_required, get_current_user_id
from supabase_client import get_supabase, get_supabase_admin
from routes.notifications import notify_admins, notify_client
from datetime import datetime
import re
import uuid

proposals_bp = Blueprint('proposals', __name__)

def get_user_organization_id(user_id):
    admin = get_supabase_admin()
    result = admin.table('organization_users').select('organization_id').eq('user_id', user_id).execute()
    return result.data[0]['organization_id'] if result.data else None

def get_user_role(user_id):
    admin = get_supabase_admin()
    result = admin.table('profiles').select('role').eq('id', user_id).single().execute()
    return result.data.get('role') if result.data else None

def resolve_template_content(content, variables):
    """Replace template variables with actual values."""
    resolved = content
    for key, value in variables.items():
        pattern = r'\{\{\s*' + re.escape(key) + r'\s*\}\}'
        resolved = re.sub(pattern, str(value), resolved)
    return resolved

@proposals_bp.route('/', methods=['GET'])
@supabase_auth_required
def get_proposals():
    """Get all proposals for the organization."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    
    if user_role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(user_id)
    if not org_id:
        return jsonify({'error': 'Organization not found'}), 404
    
    admin = get_supabase_admin()
    
    status = request.args.get('status')
    
    query = admin.table('proposals').select('*, clients(*)').eq('organization_id', org_id)
    
    if status:
        query = query.eq('status', status)
    
    result = query.order('created_at', desc=True).execute()
    
    proposals = []
    for p in result.data or []:
        proposal = {**p}
        proposal['client'] = proposal.pop('clients', None)
        # Fetch template from document_templates if template_id exists
        if proposal.get('template_id'):
            tpl = admin.table('document_templates').select('id, name, type, description').eq('id', proposal['template_id']).execute()
            proposal['template'] = tpl.data[0] if tpl.data else None
        else:
            proposal['template'] = None
        proposals.append(proposal)
    
    return jsonify({'proposals': proposals}), 200


@proposals_bp.route('/<proposal_id>', methods=['GET'])
@supabase_auth_required
def get_proposal(proposal_id):
    """Get a specific proposal."""
    user_id = get_current_user_id()
    org_id = get_user_organization_id(user_id)
    
    admin = get_supabase_admin()
    
    result = admin.table('proposals').select('*, clients(*)').eq('id', proposal_id).single().execute()
    if not result.data:
        return jsonify({'error': 'Proposal not found'}), 404
    
    proposal = result.data
    client = proposal.get('clients')
    
    if not client or client.get('organization_id') != org_id:
        return jsonify({'error': 'Proposal not found'}), 404
    
    proposal['client'] = proposal.pop('clients', None)
    # Fetch template from document_templates
    if proposal.get('template_id'):
        tpl = admin.table('document_templates').select('*').eq('id', proposal['template_id']).execute()
        proposal['template'] = tpl.data[0] if tpl.data else None
    else:
        proposal['template'] = None
    
    return jsonify({'proposal': proposal}), 200


@proposals_bp.route('/public/<token>', methods=['GET'])
def get_public_proposal(token):
    """Get a proposal by public token (no auth required)."""
    admin = get_supabase_admin()
    
    result = admin.table('proposals').select('*, clients(name)').eq('public_token', token).single().execute()
    
    if not result.data or result.data.get('status') not in ['sent', 'accepted', 'rejected']:
        return jsonify({'error': 'Proposal not found'}), 404
    
    proposal = result.data
    
    return jsonify({
        'proposal': {
            'id': proposal['id'],
            'status': proposal['status'],
            'content': proposal.get('content'),
            'total_amount': proposal.get('total_amount'),
            'client_name': proposal.get('clients', {}).get('name')
        }
    }), 200


@proposals_bp.route('/', methods=['POST'])
@supabase_auth_required
def create_proposal():
    """Create a new proposal."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    
    if user_role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.get_json()
    
    required_fields = ['client_id', 'template_id']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    admin = get_supabase_admin()
    
    # Validate client
    client_result = admin.table('clients').select('*').eq('id', data['client_id']).single().execute()
    if not client_result.data:
        return jsonify({'error': 'Client not found'}), 404
    client = client_result.data
    
    # Validate template from document_templates (V2)
    template_result = admin.table('document_templates').select('*').eq('id', data['template_id']).single().execute()
    if not template_result.data or template_result.data.get('type') != 'proposal':
        return jsonify({'error': 'Valid proposal template required'}), 400
    template = template_result.data
    
    # Merge default values with provided variables
    variables = {**template.get('default_values', {}), **data.get('variables', {})}
    variables['client_name'] = client['name']
    if client.get('email'):
        variables['client_email'] = client['email']
    resolved_content = resolve_template_content(template['content'], variables)
    
    org_id = get_user_organization_id(user_id)
    if not org_id:
        return jsonify({'error': 'Organization not found'}), 404

    proposal_data = {
        'organization_id': org_id,
        'client_id': client['id'],
        'template_id': data['template_id'],
        'title': data.get('title', f"Proposal for {client['name']}"),
        'content': resolved_content,
        'status': 'draft',
        'total_amount': data.get('total_amount')
    }
    
    result = admin.table('proposals').insert(proposal_data).execute()
    
    return jsonify({'proposal': result.data[0] if result.data else None}), 201


@proposals_bp.route('/<proposal_id>', methods=['PUT'])
@supabase_auth_required
def update_proposal(proposal_id):
    """Update a proposal (only if draft)."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    
    if user_role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(user_id)
    
    admin = get_supabase_admin()
    
    result = admin.table('proposals').select('*').eq('id', proposal_id).eq('organization_id', org_id).single().execute()
    if not result.data:
        return jsonify({'error': 'Proposal not found'}), 404
    
    if result.data.get('status') != 'draft':
        return jsonify({'error': 'Can only update draft proposals'}), 400
    
    data = request.get_json()
    update_data = {}
    
    if 'content' in data:
        update_data['content'] = data['content']
    if 'total_amount' in data:
        update_data['total_amount'] = data['total_amount']
    if 'title' in data:
        update_data['title'] = data['title']
    
    updated = admin.table('proposals').update(update_data).eq('id', proposal_id).execute()
    
    return jsonify({'proposal': updated.data[0] if updated.data else None}), 200


@proposals_bp.route('/<proposal_id>/send', methods=['POST'])
@supabase_auth_required
def send_proposal(proposal_id):
    """Send a proposal to client (generates public link)."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    
    if user_role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(user_id)
    
    admin = get_supabase_admin()
    
    result = admin.table('proposals').select('*').eq('id', proposal_id).eq('organization_id', org_id).single().execute()
    if not result.data:
        return jsonify({'error': 'Proposal not found'}), 404
    
    if result.data.get('status') != 'draft':
        return jsonify({'error': 'Proposal already sent'}), 400
    
    # Generate public token
    public_token = str(uuid.uuid4())
    
    updated = admin.table('proposals').update({
        'public_token': public_token,
        'status': 'sent',
        'sent_at': datetime.utcnow().isoformat()
    }).eq('id', proposal_id).execute()
    
    # Notify client that a proposal was sent
    proposal_data = updated.data[0] if updated.data else None
    if proposal_data:
        client_result = admin.table('clients').select('id, name').eq('id', proposal_data.get('client_id')).single().execute()
        if client_result.data:
            notify_client(
                client_id=client_result.data['id'],
                organization_id=org_id,
                notification_type='proposal_sent',
                title='New Proposal',
                message=f'You have received a new proposal: {proposal_data.get("title", "Proposal")}',
                link='/portal/proposals',
                metadata={'proposal_id': proposal_id}
            )

    return jsonify({
        'proposal': proposal_data,
        'public_url': f'/proposal/{public_token}'
    }), 200


@proposals_bp.route('/public/<token>/respond', methods=['POST'])
def respond_to_proposal(token):
    """Accept or reject a proposal (client action)."""
    admin = get_supabase_admin()
    
    result = admin.table('proposals').select('*, clients(*)').eq('public_token', token).single().execute()
    
    if not result.data or result.data.get('status') != 'sent':
        return jsonify({'error': 'Proposal not found or already responded'}), 404
    
    proposal = result.data
    client = proposal.get('clients')
    
    data = request.get_json()
    action = data.get('action')
    
    if action not in ['accept', 'reject']:
        return jsonify({'error': 'Invalid action. Must be accept or reject'}), 400
    
    if action == 'reject':
        updated = admin.table('proposals').update({
            'status': 'rejected',
            'responded_at': datetime.utcnow().isoformat()
        }).eq('id', proposal['id']).execute()

        # Notify admins that the proposal was rejected
        notify_admins(
            organization_id=client['organization_id'],
            notification_type='proposal_rejected',
            title='Proposal Rejected',
            message=f'{client["name"]} rejected the proposal.',
            link='/dashboard/proposals',
            metadata={'proposal_id': proposal['id'], 'client_name': client['name']}
        )

        return jsonify({'message': 'Proposal rejected', 'proposal': updated.data[0] if updated.data else None}), 200
    
    # ACCEPT - Triggers project creation
    admin.table('proposals').update({
        'status': 'accepted',
        'responded_at': datetime.utcnow().isoformat()
    }).eq('id', proposal['id']).execute()
    
    # Update client status
    admin.table('clients').update({'status': 'active'}).eq('id', client['id']).execute()
    
    # Create project
    project_result = admin.table('projects').insert({
        'organization_id': client['organization_id'],
        'client_id': client['id'],
        'name': f"Project for {client['name']}",
        'status': 'active'
    }).execute()
    project = project_result.data[0]
    
    # Create Onboarding phase (active)
    onboarding_result = admin.table('phases').insert({
        'project_id': project['id'],
        'name': 'Onboarding',
        'order_index': 0,
        'status': 'active'
    }).execute()
    onboarding_phase = onboarding_result.data[0]
    
    # Create onboarding milestones
    milestones_config = [
        {'title': 'Agreement Signing', 'description': 'Sign the service agreement', 'order_index': 0, 'status': 'in_progress'},
        {'title': 'Invoice Payment', 'description': 'Pay the initial invoice', 'order_index': 1, 'status': 'pending'},
        {'title': 'Resource Upload', 'description': 'Upload required resources', 'order_index': 2, 'status': 'pending'}
    ]
    
    for config in milestones_config:
        admin.table('milestones').insert({
            'phase_id': onboarding_phase['id'],
            'title': config['title'],
            'description': config['description'],
            'order_index': config['order_index'],
            'status': config['status']
        }).execute()
    
    # Create other phases (pending)
    for idx, name in enumerate(['Strategy', 'Fulfilment', 'Reporting'], start=1):
        admin.table('phases').insert({
            'project_id': project['id'],
            'name': name,
            'order_index': idx,
            'status': 'pending'
        }).execute()
    
    # Get full project with phases
    full_project = admin.table('projects').select('*').eq('id', project['id']).single().execute()
    phases = admin.table('phases').select('*').eq('project_id', project['id']).order('order_index').execute()
    
    project_data = full_project.data
    project_data['phases'] = phases.data
    
    # Notify admins that the proposal was accepted
    notify_admins(
        organization_id=client['organization_id'],
        notification_type='proposal_accepted',
        title='Proposal Accepted',
        message=f'{client["name"]} accepted the proposal. A project has been created.',
        link=f'/dashboard/projects',
        metadata={'proposal_id': proposal['id'], 'project_id': project['id'], 'client_name': client['name']}
    )

    return jsonify({
        'message': 'Proposal accepted',
        'proposal': proposal,
        'project': project_data
    }), 200
