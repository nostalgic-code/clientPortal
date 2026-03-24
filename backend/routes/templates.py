from flask import Blueprint, request, jsonify
from functools import wraps
from supabase_client import get_supabase, get_supabase_admin

templates_bp = Blueprint('templates', __name__)

def supabase_auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        return f(*args, **kwargs)
    return decorated

def get_current_user_id():
    """Extract user ID from Supabase JWT token."""
    from jose import jwt
    
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    
    token = auth_header.replace('Bearer ', '')
    try:
        payload = jwt.get_unverified_claims(token)
        return payload.get('sub')
    except Exception as e:
        print(f"Error decoding token: {e}")
        return None

def get_user_organization_id(user_id):
    """Get the organization ID for a user."""
    admin = get_supabase_admin()
    result = admin.table('organizations').select('id').eq('owner_id', user_id).limit(1).execute()
    if result.data:
        return result.data[0]['id']
    
    result = admin.table('organization_users').select('organization_id').eq('user_id', user_id).limit(1).execute()
    if result.data:
        return result.data[0]['organization_id']
    
    return None


@templates_bp.route('/', methods=['GET'])
@supabase_auth_required
def get_templates():
    """Get all templates for the organization."""
    try:
        admin = get_supabase_admin()
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        org_id = get_user_organization_id(user_id)
        if not org_id:
            return jsonify({'error': 'Organization not found'}), 404
        
        template_type = request.args.get('type')
        is_active = request.args.get('active', 'true').lower() == 'true'
        
        query = admin.table('document_templates').select('*').eq('organization_id', org_id)
        
        if template_type:
            query = query.eq('type', template_type)
        
        if is_active:
            query = query.eq('is_active', True)
        
        result = query.order('created_at', desc=True).execute()
        
        return jsonify({'templates': result.data}), 200
        
    except Exception as e:
        print(f"Error fetching templates: {e}")
        return jsonify({'error': str(e)}), 500


@templates_bp.route('/<template_id>', methods=['GET'])
@supabase_auth_required
def get_template(template_id):
    """Get a specific template."""
    try:
        admin = get_supabase_admin()
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        org_id = get_user_organization_id(user_id)
        if not org_id:
            return jsonify({'error': 'Organization not found'}), 404
        
        result = admin.table('document_templates').select('*').eq('id', template_id).eq('organization_id', org_id).single().execute()
        
        if not result.data:
            return jsonify({'error': 'Template not found'}), 404
        
        return jsonify({'template': result.data}), 200
        
    except Exception as e:
        print(f"Error fetching template: {e}")
        return jsonify({'error': str(e)}), 500


@templates_bp.route('/', methods=['POST'])
@supabase_auth_required
def create_template():
    """Create a new template."""
    try:
        admin = get_supabase_admin()
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        org_id = get_user_organization_id(user_id)
        if not org_id:
            return jsonify({'error': 'Organization not found'}), 404
        
        data = request.get_json()
        
        required_fields = ['name', 'type', 'content']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        valid_types = [
            'welcome', 'agreement', 'invoice', 'proposal', 'strategy_call',
            'project_timeline', 'deliverables', 'content_guide', 'monthly_report',
            'competitor_analysis', 'thank_you', 'custom'
        ]
        
        if data['type'] not in valid_types:
            return jsonify({'error': f'Invalid template type. Must be one of: {", ".join(valid_types)}'}), 400
        
        template_data = {
            'organization_id': org_id,
            'name': data['name'],
            'description': data.get('description'),
            'type': data['type'],
            'content': data['content'],
            'variables_schema': data.get('variables_schema', {}),
            'default_values': data.get('default_values', {}),
            'is_default': data.get('is_default', False),
            'is_active': data.get('is_active', True),
            'theme': data.get('theme', {'primaryColor': '#000000', 'fontFamily': 'Inter'})
        }
        
        result = admin.table('document_templates').insert(template_data).execute()
        
        return jsonify({'template': result.data[0], 'message': 'Template created successfully'}), 201
        
    except Exception as e:
        print(f"Error creating template: {e}")
        return jsonify({'error': str(e)}), 500


@templates_bp.route('/<template_id>', methods=['PUT'])
@supabase_auth_required
def update_template(template_id):
    """Update an existing template."""
    try:
        admin = get_supabase_admin()
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        org_id = get_user_organization_id(user_id)
        if not org_id:
            return jsonify({'error': 'Organization not found'}), 404
        
        data = request.get_json()
        
        update_data = {}
        allowed_fields = [
            'name', 'description', 'content', 'variables_schema',
            'default_values', 'is_default', 'is_active', 'theme'
        ]
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        if 'content' in update_data:
            current = admin.table('document_templates').select('version').eq('id', template_id).single().execute()
            if current.data:
                update_data['version'] = current.data['version'] + 1
        
        result = admin.table('document_templates').update(update_data).eq('id', template_id).eq('organization_id', org_id).execute()
        
        if not result.data:
            return jsonify({'error': 'Template not found'}), 404
        
        return jsonify({'template': result.data[0], 'message': 'Template updated successfully'}), 200
        
    except Exception as e:
        print(f"Error updating template: {e}")
        return jsonify({'error': str(e)}), 500


@templates_bp.route('/<template_id>', methods=['DELETE'])
@supabase_auth_required
def delete_template(template_id):
    """Delete a template (soft delete)."""
    try:
        admin = get_supabase_admin()
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        org_id = get_user_organization_id(user_id)
        if not org_id:
            return jsonify({'error': 'Organization not found'}), 404
        
        result = admin.table('document_templates').update({'is_active': False}).eq('id', template_id).eq('organization_id', org_id).execute()
        
        if not result.data:
            return jsonify({'error': 'Template not found'}), 404
        
        return jsonify({'message': 'Template deleted successfully'}), 200
        
    except Exception as e:
        print(f"Error deleting template: {e}")
        return jsonify({'error': str(e)}), 500


@templates_bp.route('/<template_id>/duplicate', methods=['POST'])
@supabase_auth_required
def duplicate_template(template_id):
    """Duplicate an existing template."""
    try:
        admin = get_supabase_admin()
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        org_id = get_user_organization_id(user_id)
        if not org_id:
            return jsonify({'error': 'Organization not found'}), 404
        
        original = admin.table('document_templates').select('*').eq('id', template_id).eq('organization_id', org_id).single().execute()
        
        if not original.data:
            return jsonify({'error': 'Template not found'}), 404
        
        data = request.get_json() or {}
        
        new_template = {
            'organization_id': org_id,
            'name': data.get('name', f"{original.data['name']} (Copy)"),
            'description': original.data.get('description'),
            'type': original.data['type'],
            'content': original.data['content'],
            'variables_schema': original.data.get('variables_schema', {}),
            'default_values': original.data.get('default_values', {}),
            'is_default': False,
            'is_active': True,
            'theme': original.data.get('theme', {})
        }
        
        result = admin.table('document_templates').insert(new_template).execute()
        
        return jsonify({'template': result.data[0], 'message': 'Template duplicated successfully'}), 201
        
    except Exception as e:
        print(f"Error duplicating template: {e}")
        return jsonify({'error': str(e)}), 500


@templates_bp.route('/<template_id>/preview', methods=['POST'])
@supabase_auth_required
def preview_template(template_id):
    """Preview a template with variables filled in."""
    try:
        admin = get_supabase_admin()
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        org_id = get_user_organization_id(user_id)
        if not org_id:
            return jsonify({'error': 'Organization not found'}), 404
        
        template = admin.table('document_templates').select('*').eq('id', template_id).eq('organization_id', org_id).single().execute()
        
        if not template.data:
            return jsonify({'error': 'Template not found'}), 404
        
        data = request.get_json() or {}
        variables = data.get('variables', {})
        
        merged_vars = {**template.data.get('default_values', {}), **variables}
        
        content = template.data['content']
        for key, value in merged_vars.items():
            content = content.replace(f'{{{{{key}}}}}', str(value) if value else '')
        
        return jsonify({
            'rendered_content': content,
            'variables_used': merged_vars,
            'template': template.data
        }), 200
        
    except Exception as e:
        print(f"Error previewing template: {e}")
        return jsonify({'error': str(e)}), 500


@templates_bp.route('/<template_id>/generate', methods=['POST'])
@supabase_auth_required
def generate_document(template_id):
    """Generate a document from a template."""
    try:
        admin = get_supabase_admin()
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        org_id = get_user_organization_id(user_id)
        if not org_id:
            return jsonify({'error': 'Organization not found'}), 404
        
        template = admin.table('document_templates').select('*').eq('id', template_id).eq('organization_id', org_id).single().execute()
        
        if not template.data:
            return jsonify({'error': 'Template not found'}), 404
        
        data = request.get_json()
        
        if not data.get('client_id'):
            return jsonify({'error': 'client_id is required'}), 400
        
        variables = data.get('variables', {})
        merged_vars = {**template.data.get('default_values', {}), **variables}
        
        content = template.data['content']
        for key, value in merged_vars.items():
            content = content.replace(f'{{{{{key}}}}}', str(value) if value else '')
        
        document_data = {
            'organization_id': org_id,
            'project_id': data.get('project_id'),
            'client_id': data['client_id'],
            'template_id': template_id,
            'name': data.get('name', template.data['name']),
            'type': template.data['type'],
            'content': content,
            'variables': merged_vars,
            'status': 'draft'
        }
        
        result = admin.table('documents').insert(document_data).execute()
        
        return jsonify({
            'document': result.data[0],
            'message': 'Document generated successfully'
        }), 201
        
    except Exception as e:
        print(f"Error generating document: {e}")
        return jsonify({'error': str(e)}), 500


@templates_bp.route('/types', methods=['GET'])
@supabase_auth_required
def get_template_types():
    """Get all available template types."""
    types = [
        {'id': 'welcome', 'name': 'Welcome Document', 'description': 'Welcome new clients with essential information'},
        {'id': 'agreement', 'name': 'Agreement/Contract', 'description': 'Service agreements and contracts'},
        {'id': 'invoice', 'name': 'Invoice', 'description': 'Payment invoices'},
        {'id': 'proposal', 'name': 'Proposal', 'description': 'Project proposals'},
        {'id': 'strategy_call', 'name': 'Strategy Call', 'description': 'Meeting scheduling and agenda'},
        {'id': 'project_timeline', 'name': 'Project Timeline', 'description': 'Track project phases and milestones'},
        {'id': 'deliverables', 'name': 'Deliverables', 'description': 'Media and file deliverables'},
        {'id': 'content_guide', 'name': 'Content Usage Guide', 'description': 'Guide for using delivered content'},
        {'id': 'monthly_report', 'name': 'Monthly Report', 'description': 'Monthly performance reports'},
        {'id': 'competitor_analysis', 'name': 'Competitor Analysis', 'description': 'Competitor research and insights'},
        {'id': 'thank_you', 'name': 'Thank You', 'description': 'Project completion thank you'},
        {'id': 'custom', 'name': 'Custom', 'description': 'Custom document type'}
    ]
    
    return jsonify({'types': types}), 200
