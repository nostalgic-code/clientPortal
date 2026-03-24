from flask import Blueprint, request, jsonify
from routes.auth import supabase_auth_required, get_current_user_id
from supabase_client import get_supabase_admin

org_settings_bp = Blueprint('org_settings', __name__)


def get_user_organization(user_id):
    """Get the user's organization with membership info."""
    admin = get_supabase_admin()
    result = admin.table('organization_users').select(
        '*, organizations(*)'
    ).eq('user_id', user_id).execute()
    if result.data:
        return result.data[0]
    return None


@org_settings_bp.route('/', methods=['GET'])
@supabase_auth_required
def get_organization():
    """Get the current user's organization details."""
    user_id = get_current_user_id()
    admin = get_supabase_admin()

    membership = get_user_organization(user_id)
    if not membership or not membership.get('organizations'):
        return jsonify({'error': 'Organization not found'}), 404

    org = membership['organizations']
    org_id = org['id']

    # Get member count
    members_result = admin.table('organization_users').select(
        'id', count='exact'
    ).eq('organization_id', org_id).execute()
    member_count = members_result.count if members_result.count is not None else 0

    # Get client count
    clients_result = admin.table('clients').select(
        'id', count='exact'
    ).eq('organization_id', org_id).execute()
    client_count = clients_result.count if clients_result.count is not None else 0

    # Get project count
    projects_result = admin.table('projects').select(
        'id', count='exact'
    ).eq('organization_id', org_id).execute()
    project_count = projects_result.count if projects_result.count is not None else 0

    return jsonify({
        'organization': org,
        'role': membership['role'],
        'stats': {
            'members': member_count,
            'clients': client_count,
            'projects': project_count,
        }
    }), 200


@org_settings_bp.route('/', methods=['PUT'])
@supabase_auth_required
def update_organization():
    """Update organization details. Only the owner/admin can do this."""
    user_id = get_current_user_id()
    admin = get_supabase_admin()

    membership = get_user_organization(user_id)
    if not membership or not membership.get('organizations'):
        return jsonify({'error': 'Organization not found'}), 404

    org = membership['organizations']

    # Only admin/owner can update
    if membership['role'] != 'admin' and org.get('owner_id') != user_id:
        return jsonify({'error': 'Only organization admins can update settings'}), 403

    data = request.get_json()
    update_data = {}

    if 'name' in data:
        update_data['name'] = data['name']

    if not update_data:
        return jsonify({'error': 'No fields to update'}), 400

    result = admin.table('organizations').update(
        update_data
    ).eq('id', org['id']).execute()

    return jsonify({
        'organization': result.data[0] if result.data else org,
        'message': 'Organization updated successfully'
    }), 200


@org_settings_bp.route('/profile', methods=['GET'])
@supabase_auth_required
def get_profile():
    """Get the current user's profile."""
    user_id = get_current_user_id()
    admin = get_supabase_admin()

    result = admin.table('profiles').select('*').eq('id', user_id).single().execute()
    if not result.data:
        return jsonify({'error': 'Profile not found'}), 404

    return jsonify({'profile': result.data}), 200


@org_settings_bp.route('/profile', methods=['PUT'])
@supabase_auth_required
def update_profile():
    """Update the current user's profile."""
    user_id = get_current_user_id()
    admin = get_supabase_admin()

    data = request.get_json()
    update_data = {}

    allowed_fields = ['name', 'phone', 'company_name', 'avatar_url']
    for field in allowed_fields:
        if field in data:
            update_data[field] = data[field]

    if not update_data:
        return jsonify({'error': 'No fields to update'}), 400

    result = admin.table('profiles').update(
        update_data
    ).eq('id', user_id).execute()

    return jsonify({
        'profile': result.data[0] if result.data else None,
        'message': 'Profile updated successfully'
    }), 200
