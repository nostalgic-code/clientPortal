from flask import Blueprint, request, jsonify
from routes.auth import supabase_auth_required, get_current_user_id
from supabase_client import get_supabase, get_supabase_admin

clients_bp = Blueprint('clients', __name__)

def get_user_organization_id(user_id):
    """Get the organization ID for a user."""
    admin = get_supabase_admin()
    result = admin.table('organization_users').select('organization_id').eq('user_id', user_id).execute()
    return result.data[0]['organization_id'] if result.data else None

def get_user_role(user_id):
    """Get the user's role from their profile."""
    admin = get_supabase_admin()
    result = admin.table('profiles').select('role').eq('id', user_id).single().execute()
    return result.data.get('role') if result.data else None

@clients_bp.route('/', methods=['GET'])
@supabase_auth_required
def get_clients():
    """Get all clients for the organization."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    
    if user_role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(user_id)
    if not org_id:
        return jsonify({'error': 'Organization not found'}), 404
    
    admin = get_supabase_admin()
    status = request.args.get('status')
    
    query = admin.table('clients').select('*').eq('organization_id', org_id)
    
    if status:
        query = query.eq('status', status)
    
    result = query.order('created_at', desc=True).execute()
    
    return jsonify({'clients': result.data}), 200


@clients_bp.route('/<client_id>', methods=['GET'])
@supabase_auth_required
def get_client(client_id):
    """Get a specific client."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    org_id = get_user_organization_id(user_id)
    
    admin = get_supabase_admin()
    result = admin.table('clients').select('*').eq('id', client_id).single().execute()
    
    if not result.data or result.data.get('organization_id') != org_id:
        return jsonify({'error': 'Client not found'}), 404
    
    client = result.data
    
    # Clients can only view their own profile
    if user_role == 'client' and client.get('user_id') != user_id:
        return jsonify({'error': 'Access denied'}), 403
    
    return jsonify({'client': client}), 200


@clients_bp.route('/', methods=['POST'])
@supabase_auth_required
def create_client():
    """Create a new client."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    
    if user_role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(user_id)
    if not org_id:
        return jsonify({'error': 'Organization not found'}), 404
    
    data = request.get_json()
    
    required_fields = ['name', 'email']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    admin = get_supabase_admin()
    result = admin.table('clients').insert({
        'organization_id': org_id,
        'name': data['name'],
        'email': data['email'],
        'phone': data.get('phone'),
        'company': data.get('company'),
        'status': data.get('status', 'lead')
    }).execute()
    
    return jsonify({'client': result.data[0] if result.data else None}), 201


@clients_bp.route('/<client_id>', methods=['PUT'])
@supabase_auth_required
def update_client(client_id):
    """Update a client."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    
    if user_role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(user_id)
    
    admin = get_supabase_admin()
    
    # Check client exists and belongs to org
    existing = admin.table('clients').select('id, organization_id').eq('id', client_id).single().execute()
    if not existing.data or existing.data.get('organization_id') != org_id:
        return jsonify({'error': 'Client not found'}), 404
    
    data = request.get_json()
    update_data = {}
    
    if 'name' in data:
        update_data['name'] = data['name']
    if 'email' in data:
        update_data['email'] = data['email']
    if 'phone' in data:
        update_data['phone'] = data['phone']
    if 'company' in data:
        update_data['company'] = data['company']
    if 'status' in data:
        update_data['status'] = data['status']
    
    result = admin.table('clients').update(update_data).eq('id', client_id).execute()
    
    return jsonify({'client': result.data[0] if result.data else None}), 200


@clients_bp.route('/<client_id>', methods=['DELETE'])
@supabase_auth_required
def delete_client(client_id):
    """Delete a client (only if no projects)."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    
    if user_role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(user_id)
    
    admin = get_supabase_admin()
    
    # Check client exists and belongs to org
    existing = admin.table('clients').select('id, organization_id').eq('id', client_id).single().execute()
    if not existing.data or existing.data.get('organization_id') != org_id:
        return jsonify({'error': 'Client not found'}), 404
    
    # Check if client has projects
    projects = admin.table('projects').select('id').eq('client_id', client_id).execute()
    if projects.data and len(projects.data) > 0:
        return jsonify({'error': 'Cannot delete client with active projects'}), 400
    
    admin.table('clients').delete().eq('id', client_id).execute()
    
    return jsonify({'message': 'Client deleted successfully'}), 200
