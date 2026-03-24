from flask import Blueprint, request, jsonify
from functools import wraps
from supabase_client import get_supabase, get_supabase_admin
from routes.notifications import notify_client

documents_bp = Blueprint('documents', __name__)

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


@documents_bp.route('/', methods=['GET'])
@supabase_auth_required
def get_documents():
    """Get all documents for the organization."""
    try:
        admin = get_supabase_admin()
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        org_id = get_user_organization_id(user_id)
        if not org_id:
            return jsonify({'error': 'Organization not found'}), 404
        
        # Query parameters
        doc_type = request.args.get('type')
        client_id = request.args.get('client_id')
        project_id = request.args.get('project_id')
        status = request.args.get('status')
        
        query = admin.table('documents').select('*, clients(name, email), projects(name)').eq('organization_id', org_id)
        
        if doc_type:
            query = query.eq('type', doc_type)
        if client_id:
            query = query.eq('client_id', client_id)
        if project_id:
            query = query.eq('project_id', project_id)
        if status:
            query = query.eq('status', status)
        
        result = query.order('created_at', desc=True).execute()
        
        return jsonify({'documents': result.data}), 200
        
    except Exception as e:
        print(f"Error fetching documents: {e}")
        return jsonify({'error': str(e)}), 500


@documents_bp.route('/<document_id>', methods=['GET'])
@supabase_auth_required
def get_document(document_id):
    """Get a specific document."""
    try:
        admin = get_supabase_admin()
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        org_id = get_user_organization_id(user_id)
        if not org_id:
            return jsonify({'error': 'Organization not found'}), 404
        
        result = admin.table('documents').select('*, clients(name, email), projects(name), document_templates(name, type)').eq('id', document_id).eq('organization_id', org_id).single().execute()
        
        if not result.data:
            return jsonify({'error': 'Document not found'}), 404
        
        return jsonify({'document': result.data}), 200
        
    except Exception as e:
        print(f"Error fetching document: {e}")
        return jsonify({'error': str(e)}), 500


@documents_bp.route('/', methods=['POST'])
@supabase_auth_required
def create_document():
    """Create a new document."""
    try:
        admin = get_supabase_admin()
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        org_id = get_user_organization_id(user_id)
        if not org_id:
            return jsonify({'error': 'Organization not found'}), 404
        
        data = request.get_json()
        
        required_fields = ['name', 'type', 'content', 'client_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        valid_types = [
            'welcome', 'agreement', 'invoice', 'proposal', 'strategy_call',
            'project_timeline', 'deliverables', 'content_guide', 'monthly_report',
            'competitor_analysis', 'thank_you', 'custom'
        ]
        
        if data['type'] not in valid_types:
            return jsonify({'error': f'Invalid document type'}), 400
        
        document_data = {
            'organization_id': org_id,
            'client_id': data['client_id'],
            'project_id': data.get('project_id'),
            'template_id': data.get('template_id'),
            'name': data['name'],
            'type': data['type'],
            'content': data['content'],
            'variables': data.get('variables', {}),
            'status': 'draft'
        }
        
        result = admin.table('documents').insert(document_data).execute()
        
        return jsonify({'document': result.data[0], 'message': 'Document created successfully'}), 201
        
    except Exception as e:
        print(f"Error creating document: {e}")
        return jsonify({'error': str(e)}), 500


@documents_bp.route('/<document_id>', methods=['PUT'])
@supabase_auth_required
def update_document(document_id):
    """Update a document."""
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
        allowed_fields = ['name', 'content', 'variables', 'status']
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        result = admin.table('documents').update(update_data).eq('id', document_id).eq('organization_id', org_id).execute()
        
        if not result.data:
            return jsonify({'error': 'Document not found'}), 404
        
        return jsonify({'document': result.data[0], 'message': 'Document updated successfully'}), 200
        
    except Exception as e:
        print(f"Error updating document: {e}")
        return jsonify({'error': str(e)}), 500


@documents_bp.route('/<document_id>', methods=['DELETE'])
@supabase_auth_required
def delete_document(document_id):
    """Delete a document."""
    try:
        admin = get_supabase_admin()
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        org_id = get_user_organization_id(user_id)
        if not org_id:
            return jsonify({'error': 'Organization not found'}), 404
        
        result = admin.table('documents').delete().eq('id', document_id).eq('organization_id', org_id).execute()
        
        if not result.data:
            return jsonify({'error': 'Document not found'}), 404
        
        return jsonify({'message': 'Document deleted successfully'}), 200
        
    except Exception as e:
        print(f"Error deleting document: {e}")
        return jsonify({'error': str(e)}), 500


@documents_bp.route('/<document_id>/send', methods=['POST'])
@supabase_auth_required
def send_document(document_id):
    """Send a document to the client."""
    try:
        admin = get_supabase_admin()
        user_id = get_current_user_id()
        
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        org_id = get_user_organization_id(user_id)
        if not org_id:
            return jsonify({'error': 'Organization not found'}), 404
        
        from datetime import datetime
        
        result = admin.table('documents').update({
            'status': 'sent',
            'sent_at': datetime.utcnow().isoformat()
        }).eq('id', document_id).eq('organization_id', org_id).execute()
        
        if not result.data:
            return jsonify({'error': 'Document not found'}), 404
        
        # Notify client that a document was sent
        sent_doc = result.data[0]
        if sent_doc.get('client_id'):
            notify_client(
                client_id=sent_doc['client_id'],
                organization_id=org_id,
                notification_type='document_sent',
                title='New Document',
                message=f'You have received a new document: {sent_doc.get("name", "Document")}',
                link='/portal/documents',
                metadata={'document_id': document_id, 'document_type': sent_doc.get('type')}
            )
        
        return jsonify({'document': sent_doc, 'message': 'Document sent successfully'}), 200
        
    except Exception as e:
        print(f"Error sending document: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================
# PUBLIC ACCESS (for clients viewing documents)
# ============================================

@documents_bp.route('/public/<public_token>', methods=['GET'])
def get_public_document(public_token):
    """Get a document by public token (no auth required)."""
    try:
        admin = get_supabase_admin()
        
        result = admin.table('documents').select('id, name, type, content, status, created_at, clients(name)').eq('public_token', public_token).single().execute()
        
        if not result.data:
            return jsonify({'error': 'Document not found'}), 404
        
        # Mark as viewed if first view
        if result.data['status'] == 'sent':
            from datetime import datetime
            admin.table('documents').update({
                'status': 'viewed',
                'viewed_at': datetime.utcnow().isoformat()
            }).eq('public_token', public_token).execute()
        
        return jsonify({'document': result.data}), 200
        
    except Exception as e:
        print(f"Error fetching public document: {e}")
        return jsonify({'error': str(e)}), 500


@documents_bp.route('/public/<public_token>/sign', methods=['POST'])
def sign_public_document(public_token):
    """Sign a document (agreement) via public token."""
    try:
        admin = get_supabase_admin()
        
        data = request.get_json()
        
        from datetime import datetime
        
        result = admin.table('documents').update({
            'status': 'signed',
            'signed_at': datetime.utcnow().isoformat(),
            'signature_data': {
                'name': data.get('name'),
                'signature': data.get('signature'),  # Base64 signature image
                'ip_address': request.remote_addr,
                'user_agent': request.user_agent.string,
                'signed_at': datetime.utcnow().isoformat()
            }
        }).eq('public_token', public_token).execute()
        
        if not result.data:
            return jsonify({'error': 'Document not found'}), 404
        
        # Auto-complete "Agreement Signing" milestone if this is an agreement
        signed_doc = result.data[0]
        if signed_doc.get('type') == 'agreement' and signed_doc.get('client_id'):
            try:
                from routes.projects import complete_milestone_cascade
                client_id = signed_doc['client_id']
                project_result = admin.table('projects').select('id').eq('client_id', client_id).eq('status', 'active').order('created_at', desc=True).limit(1).execute()
                if project_result.data:
                    project_id = project_result.data[0]['id']
                    phases = admin.table('phases').select('id').eq('project_id', project_id).execute().data or []
                    for phase in phases:
                        milestones = admin.table('milestones').select('id, title, status').eq('phase_id', phase['id']).execute().data or []
                        for m in milestones:
                            if 'agreement' in m['title'].lower() and 'sign' in m['title'].lower() and m['status'] in ('pending', 'in_progress'):
                                print(f"[AUTO-COMPLETE] Completing milestone '{m['title']}' on document signing")
                                complete_milestone_cascade(admin, m['id'])
                                break
            except Exception as e:
                print(f"[AUTO-COMPLETE] Error on public doc signing: {e}")
        
        return jsonify({'document': signed_doc, 'message': 'Document signed successfully'}), 200
        
    except Exception as e:
        print(f"Error signing document: {e}")
        return jsonify({'error': str(e)}), 500
