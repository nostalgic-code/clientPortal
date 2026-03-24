"""
Client Portal API - All endpoints for the client-facing portal.
Handles: dashboard, documents (view/sign), project, invoices, file uploads.
"""

from flask import Blueprint, request, jsonify, send_file, current_app
from functools import wraps
from supabase_client import get_supabase_admin
from routes.notifications import notify_admins, notify_client
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import uuid
import json

client_portal_bp = Blueprint('client_portal', __name__)

ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp',
    'zip', 'rar', 'txt', 'csv', 'mp4', 'mov', 'ai', 'psd', 'eps'
}

UPLOAD_CATEGORIES = ['logo', 'brand', 'content', 'document', 'image', 'video', 'other']


# ==========================================
# AUTH HELPERS
# ==========================================

def portal_auth_required(f):
    """Require valid JWT token for portal endpoints."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        return f(*args, **kwargs)
    return decorated


def get_current_user_id():
    """Extract user ID from JWT token."""
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


def get_client_record(user_id):
    """Get the client record for a user (clients.user_id = user_id)."""
    admin = get_supabase_admin()
    result = admin.table('clients').select('*').eq('user_id', user_id).limit(1).execute()
    return result.data[0] if result.data else None


def get_client_projects(client_id):
    """Get all project IDs for a client."""
    admin = get_supabase_admin()
    result = admin.table('projects').select('id').eq('client_id', client_id).execute()
    return [p['id'] for p in (result.data or [])]


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_upload_dir(client_id):
    """Get the upload directory for a client, creating it if needed."""
    base = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'portal', str(client_id))
    os.makedirs(base, exist_ok=True)
    return base


def get_catalog_path(client_id):
    """Get the path to the client's upload catalog JSON."""
    return os.path.join(get_upload_dir(client_id), '_catalog.json')


def read_catalog(client_id):
    """Read the upload catalog for a client."""
    path = get_catalog_path(client_id)
    if os.path.exists(path):
        with open(path, 'r') as f:
            return json.load(f)
    return {'files': []}


def write_catalog(client_id, catalog):
    """Write the upload catalog for a client."""
    path = get_catalog_path(client_id)
    with open(path, 'w') as f:
        json.dump(catalog, f, indent=2, default=str)


def _auto_complete_milestone_by_title(admin, client_id, milestone_title):
    """Auto-complete a milestone by title for the client's active project.
    
    Looks for the milestone with the given title in the client's active project,
    and if it's in_progress or pending, completes it and cascades to the next milestone/phase.
    """
    from routes.projects import complete_milestone_cascade
    
    try:
        # Get client's most recent active project
        project_result = admin.table('projects').select('id').eq('client_id', client_id).eq('status', 'active').order('created_at', desc=True).limit(1).execute()
        if not project_result.data:
            print(f"[AUTO-COMPLETE] No active project found for client {client_id}")
            return
        
        project_id = project_result.data[0]['id']
        
        # Get all phases for this project
        phases = admin.table('phases').select('id').eq('project_id', project_id).execute().data or []
        phase_ids = [p['id'] for p in phases]
        
        if not phase_ids:
            return
        
        # Find the milestone with matching title
        for phase_id in phase_ids:
            milestones = admin.table('milestones').select('id, title, status').eq('phase_id', phase_id).execute().data or []
            for m in milestones:
                if m['title'].lower() == milestone_title.lower() and m['status'] in ('pending', 'in_progress'):
                    print(f"[AUTO-COMPLETE] Completing milestone '{m['title']}' (id: {m['id']})")
                    complete_milestone_cascade(admin, m['id'])
                    return
        
        print(f"[AUTO-COMPLETE] Milestone '{milestone_title}' not found or already completed")
    except Exception as e:
        print(f"[AUTO-COMPLETE] Error completing milestone '{milestone_title}': {e}")


# ==========================================
# DASHBOARD
# ==========================================

@client_portal_bp.route('/dashboard', methods=['GET'])
@portal_auth_required
def get_dashboard():
    """Get client portal dashboard overview."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        client = get_client_record(user_id)
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404

        admin = get_supabase_admin()
        client_id = client['id']

        # Get active project
        project_result = admin.table('projects').select('*').eq('client_id', client_id).order('created_at', desc=True).limit(1).execute()
        project = project_result.data[0] if project_result.data else None

        # Get proposals stats
        proposals_result = admin.table('proposals').select('id, status').eq('client_id', client_id).in_('status', ['sent', 'accepted', 'rejected']).execute()
        proposals = proposals_result.data or []
        pending_proposals = [p for p in proposals if p['status'] == 'sent']

        # Get documents stats
        docs_result = admin.table('documents').select('id, status, type').eq('client_id', client_id).execute()
        documents = docs_result.data or []
        pending_docs = [d for d in documents if d['status'] in ('sent', 'viewed')]
        signed_docs = [d for d in documents if d['status'] == 'signed']

        # Get invoices stats
        project_ids = get_client_projects(client_id)
        total_invoices = []
        if project_ids:
            inv_result = admin.table('invoices').select('id, status, total, subtotal, currency').in_('project_id', project_ids).execute()
            total_invoices = inv_result.data or []

        unpaid = [i for i in total_invoices if i['status'] in ('sent', 'draft')]
        paid = [i for i in total_invoices if i['status'] == 'paid']

        # Get upload count
        catalog = read_catalog(client_id)
        upload_count = len(catalog.get('files', []))

        # Get project progress
        progress = 0
        active_phase_name = None
        if project:
            phases_result = admin.table('phases').select('id, name, status, order_index').eq('project_id', project['id']).order('order_index').execute()
            phases = phases_result.data or []
            completed = len([p for p in phases if p['status'] == 'completed'])
            total = len(phases)
            progress = round((completed / total) * 100) if total > 0 else 0
            active_phase = next((p for p in phases if p['status'] == 'active'), None)
            active_phase_name = active_phase['name'] if active_phase else None

        return jsonify({
            'client': {
                'id': client['id'],
                'name': client['name'],
                'email': client['email'],
                'company': client.get('company'),
            },
            'project': {
                'id': project['id'] if project else None,
                'name': project['name'] if project else None,
                'status': project['status'] if project else None,
                'progress': progress,
                'active_phase': active_phase_name,
            } if project else None,
            'stats': {
                'total_proposals': len(proposals),
                'pending_proposals': len(pending_proposals),
                'total_documents': len(documents),
                'pending_documents': len(pending_docs),
                'signed_documents': len(signed_docs),
                'total_invoices': len(total_invoices),
                'unpaid_invoices': len(unpaid),
                'paid_invoices': len(paid),
                'uploads': upload_count,
            }
        }), 200

    except Exception as e:
        print(f"Portal dashboard error: {e}")
        return jsonify({'error': str(e)}), 500


# ==========================================
# PROPOSALS
# ==========================================

@client_portal_bp.route('/proposals', methods=['GET'])
@portal_auth_required
def get_client_proposals():
    """Get all proposals sent to this client."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        client = get_client_record(user_id)
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404

        admin = get_supabase_admin()

        # Only show proposals that have been sent (not drafts)
        result = admin.table('proposals').select(
            'id, title, status, content, total_amount, currency, public_token, sent_at, responded_at, valid_until, created_at, updated_at'
        ).eq('client_id', client['id']).in_(
            'status', ['sent', 'accepted', 'rejected']
        ).order('created_at', desc=True).execute()

        return jsonify({'proposals': result.data or []}), 200

    except Exception as e:
        print(f"Portal proposals error: {e}")
        return jsonify({'error': str(e)}), 500


@client_portal_bp.route('/proposals/<proposal_id>', methods=['GET'])
@portal_auth_required
def get_client_proposal(proposal_id):
    """Get a specific proposal for this client."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        client = get_client_record(user_id)
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404

        admin = get_supabase_admin()

        result = admin.table('proposals').select('*').eq('id', proposal_id).eq('client_id', client['id']).single().execute()

        if not result.data:
            return jsonify({'error': 'Proposal not found'}), 404

        return jsonify({'proposal': result.data}), 200

    except Exception as e:
        print(f"Portal proposal detail error: {e}")
        return jsonify({'error': str(e)}), 500


@client_portal_bp.route('/proposals/<proposal_id>/respond', methods=['POST'])
@portal_auth_required
def respond_to_client_proposal(proposal_id):
    """Accept or reject a proposal (authenticated client action)."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        client = get_client_record(user_id)
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404

        admin = get_supabase_admin()

        # Verify proposal belongs to this client
        result = admin.table('proposals').select('*').eq('id', proposal_id).eq('client_id', client['id']).single().execute()

        if not result.data:
            return jsonify({'error': 'Proposal not found'}), 404

        proposal = result.data

        if proposal.get('status') != 'sent':
            return jsonify({'error': 'Proposal already responded to'}), 400

        data = request.get_json() or {}
        action = data.get('action')

        if action not in ['accept', 'reject']:
            return jsonify({'error': 'Invalid action. Must be accept or reject'}), 400

        now = datetime.utcnow().isoformat()

        if action == 'reject':
            updated = admin.table('proposals').update({
                'status': 'rejected',
                'responded_at': now
            }).eq('id', proposal['id']).execute()

            # Notify admins
            notify_admins(
                organization_id=client['organization_id'],
                notification_type='proposal_rejected',
                title='Proposal Rejected',
                message=f'{client["name"]} rejected the proposal.',
                link='/dashboard/proposals',
                metadata={'proposal_id': proposal['id'], 'client_name': client['name']}
            )

            return jsonify({
                'message': 'Proposal rejected',
                'proposal': updated.data[0] if updated.data else None
            }), 200

        # ACCEPT - Update proposal
        admin.table('proposals').update({
            'status': 'accepted',
            'responded_at': now
        }).eq('id', proposal['id']).execute()

        # Update client status to active
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
            link='/dashboard/projects',
            metadata={'proposal_id': proposal['id'], 'project_id': project['id'], 'client_name': client['name']}
        )

        return jsonify({
            'message': 'Proposal accepted! Your project has been created.',
            'proposal': {**proposal, 'status': 'accepted', 'responded_at': now},
            'project': project_data
        }), 200

    except Exception as e:
        print(f"Portal proposal respond error: {e}")
        return jsonify({'error': str(e)}), 500


# ==========================================
# DOCUMENTS
# ==========================================

@client_portal_bp.route('/documents', methods=['GET'])
@portal_auth_required
def get_client_documents():
    """Get all documents sent to this client."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        client = get_client_record(user_id)
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404

        admin = get_supabase_admin()

        # Only show documents with status 'sent' or later (not drafts)
        result = admin.table('documents').select(
            'id, name, type, status, content, created_at, sent_at, viewed_at, signed_at, public_token, signature_data'
        ).eq('client_id', client['id']).in_(
            'status', ['sent', 'viewed', 'signed', 'approved', 'rejected']
        ).order('created_at', desc=True).execute()

        return jsonify({'documents': result.data or []}), 200

    except Exception as e:
        print(f"Portal documents error: {e}")
        return jsonify({'error': str(e)}), 500


@client_portal_bp.route('/documents/<document_id>', methods=['GET'])
@portal_auth_required
def get_client_document(document_id):
    """Get a specific document for this client."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        client = get_client_record(user_id)
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404

        admin = get_supabase_admin()

        result = admin.table('documents').select('*').eq('id', document_id).eq('client_id', client['id']).single().execute()

        if not result.data:
            return jsonify({'error': 'Document not found'}), 404

        doc = result.data

        # Auto-mark as viewed if status is 'sent'
        if doc['status'] == 'sent':
            admin.table('documents').update({
                'status': 'viewed',
                'viewed_at': datetime.utcnow().isoformat()
            }).eq('id', document_id).execute()
            doc['status'] = 'viewed'
            doc['viewed_at'] = datetime.utcnow().isoformat()

        return jsonify({'document': doc}), 200

    except Exception as e:
        print(f"Portal document detail error: {e}")
        return jsonify({'error': str(e)}), 500


@client_portal_bp.route('/documents/<document_id>/sign', methods=['POST'])
@portal_auth_required
def sign_client_document(document_id):
    """Sign a document (e.g., agreement)."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        client = get_client_record(user_id)
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404

        admin = get_supabase_admin()

        # Verify document belongs to client
        doc_result = admin.table('documents').select('id, status, client_id').eq('id', document_id).eq('client_id', client['id']).single().execute()

        if not doc_result.data:
            return jsonify({'error': 'Document not found'}), 404

        if doc_result.data['status'] == 'signed':
            return jsonify({'error': 'Document already signed'}), 400

        data = request.get_json() or {}

        now = datetime.utcnow().isoformat()
        update_data = {
            'status': 'signed',
            'signed_at': now,
            'signature_data': {
                'name': data.get('name', client['name']),
                'signature': data.get('signature', ''),
                'ip_address': request.remote_addr,
                'user_agent': request.user_agent.string,
                'signed_at': now,
            }
        }

        result = admin.table('documents').update(update_data).eq('id', document_id).execute()

        # AUTO-COMPLETE: If this is an agreement document, complete the "Agreement Signing" milestone
        doc_full = admin.table('documents').select('type, project_id, client_id, name').eq('id', document_id).single().execute()
        if doc_full.data and doc_full.data.get('type') == 'agreement':
            _auto_complete_milestone_by_title(admin, doc_full.data.get('client_id'), 'Agreement Signing')

        # Notify admins that a document was signed
        notify_admins(
            organization_id=client['organization_id'],
            notification_type='document_signed',
            title='Document Signed',
            message=f'{client["name"]} signed the document: {doc_full.data.get("name", "Document") if doc_full.data else "Document"}',
            link='/dashboard/documents',
            metadata={'document_id': document_id, 'client_name': client['name']}
        )

        return jsonify({
            'document': result.data[0] if result.data else None,
            'message': 'Document signed successfully'
        }), 200

    except Exception as e:
        print(f"Portal sign document error: {e}")
        return jsonify({'error': str(e)}), 500


# ==========================================
# PROJECT
# ==========================================

@client_portal_bp.route('/project', methods=['GET'])
@portal_auth_required
def get_client_project():
    """Get the client's active project with phases and milestones."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        client = get_client_record(user_id)
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404

        admin = get_supabase_admin()

        # Get the client's most recent project
        project_result = admin.table('projects').select('*').eq('client_id', client['id']).order('created_at', desc=True).limit(1).execute()

        if not project_result.data:
            return jsonify({'project': None}), 200

        project = project_result.data[0]

        # Get phases with milestones
        phases_result = admin.table('phases').select('*').eq('project_id', project['id']).order('order_index').execute()
        phases = phases_result.data or []

        for phase in phases:
            milestones_result = admin.table('milestones').select('*').eq('phase_id', phase['id']).order('order_index').execute()
            phase['milestones'] = milestones_result.data or []

        project['phases'] = phases

        # Get active phase
        active_phase = next((p for p in phases if p['status'] == 'active'), None)
        project['active_phase'] = active_phase

        # Calculate progress
        completed = len([p for p in phases if p['status'] == 'completed'])
        total = len(phases)
        project['progress'] = round((completed / total) * 100) if total > 0 else 0

        return jsonify({'project': project}), 200

    except Exception as e:
        print(f"Portal project error: {e}")
        return jsonify({'error': str(e)}), 500


# ==========================================
# INVOICES
# ==========================================

@client_portal_bp.route('/invoices', methods=['GET'])
@portal_auth_required
def get_client_invoices():
    """Get invoices for the client's projects."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        client = get_client_record(user_id)
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404

        admin = get_supabase_admin()
        client_id = client['id']

        # Get invoices by client_id directly (V2 schema has client_id on invoices)
        # Also fall back to project_ids for older invoices
        project_ids = get_client_projects(client_id)

        # Query by client_id OR project_id
        invoices_by_client = admin.table('invoices').select(
            '*, projects(name)'
        ).eq('client_id', client_id).order('created_at', desc=True).execute()
        
        # Also get by project_ids in case client_id wasn't set
        invoices_by_project = []
        if project_ids:
            proj_result = admin.table('invoices').select(
                '*, projects(name)'
            ).in_('project_id', project_ids).order('created_at', desc=True).execute()
            invoices_by_project = proj_result.data or []

        # Merge and deduplicate
        seen_ids = set()
        all_invoices = []
        for inv_list in [invoices_by_client.data or [], invoices_by_project]:
            for inv in inv_list:
                if inv['id'] not in seen_ids:
                    seen_ids.add(inv['id'])
                    invoice = {**inv}
                    invoice['project'] = invoice.pop('projects', None)
                    all_invoices.append(invoice)

        return jsonify({'invoices': all_invoices}), 200

    except Exception as e:
        print(f"Portal invoices error: {e}")
        return jsonify({'error': str(e)}), 500


@client_portal_bp.route('/invoices/<invoice_id>', methods=['GET'])
@portal_auth_required
def get_client_invoice(invoice_id):
    """Get a specific invoice."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        client = get_client_record(user_id)
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404

        admin = get_supabase_admin()
        project_ids = get_client_projects(client['id'])

        result = admin.table('invoices').select('*, projects(name)').eq('id', invoice_id).single().execute()

        if not result.data:
            return jsonify({'error': 'Invoice not found'}), 404

        invoice = result.data
        if invoice.get('project_id') not in project_ids:
            return jsonify({'error': 'Access denied'}), 403

        invoice['project'] = invoice.pop('projects', None)
        return jsonify({'invoice': invoice}), 200

    except Exception as e:
        print(f"Portal invoice detail error: {e}")
        return jsonify({'error': str(e)}), 500


# ==========================================
# FILE UPLOADS
# ==========================================

@client_portal_bp.route('/uploads', methods=['GET'])
@portal_auth_required
def list_uploads():
    """List all uploaded files for this client."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        client = get_client_record(user_id)
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404

        catalog = read_catalog(client['id'])
        category = request.args.get('category')

        files = catalog.get('files', [])
        if category and category != 'all':
            files = [f for f in files if f.get('category') == category]

        return jsonify({'uploads': files, 'total': len(files)}), 200

    except Exception as e:
        print(f"Portal list uploads error: {e}")
        return jsonify({'error': str(e)}), 500


@client_portal_bp.route('/uploads', methods=['POST'])
@portal_auth_required
def upload_file():
    """Upload a file from the client."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        client = get_client_record(user_id)
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': f'File type not allowed. Allowed: {", ".join(sorted(ALLOWED_EXTENSIONS))}'}), 400

        category = request.form.get('category', 'other')
        if category not in UPLOAD_CATEGORIES:
            category = 'other'

        notes = request.form.get('notes', '')

        # Generate unique filename
        file_id = str(uuid.uuid4())
        original_filename = secure_filename(file.filename)
        storage_name = f"{file_id}_{original_filename}"

        # Save file
        upload_dir = get_upload_dir(client['id'])
        file_path = os.path.join(upload_dir, storage_name)
        file.save(file_path)

        file_size = os.path.getsize(file_path)

        # Update catalog
        file_entry = {
            'id': file_id,
            'filename': file.filename,
            'storage_name': storage_name,
            'category': category,
            'size': file_size,
            'mime_type': file.content_type or 'application/octet-stream',
            'notes': notes,
            'uploaded_at': datetime.utcnow().isoformat(),
        }

        catalog = read_catalog(client['id'])
        catalog['files'].append(file_entry)
        write_catalog(client['id'], catalog)

        # Notify admins that a client uploaded a file
        notify_admins(
            organization_id=client['organization_id'],
            notification_type='file_uploaded',
            title='New File Upload',
            message=f'{client["name"]} uploaded a file: {file.filename} ({category})',
            link='/dashboard/client-uploads',
            metadata={'file_id': file_id, 'filename': file.filename, 'category': category, 'client_name': client['name']}
        )

        return jsonify({
            'upload': file_entry,
            'message': 'File uploaded successfully'
        }), 201

    except Exception as e:
        print(f"Portal upload error: {e}")
        return jsonify({'error': str(e)}), 500


@client_portal_bp.route('/uploads/<file_id>', methods=['DELETE'])
@portal_auth_required
def delete_upload(file_id):
    """Delete an uploaded file."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        client = get_client_record(user_id)
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404

        catalog = read_catalog(client['id'])
        file_entry = next((f for f in catalog['files'] if f['id'] == file_id), None)

        if not file_entry:
            return jsonify({'error': 'File not found'}), 404

        # Delete physical file
        upload_dir = get_upload_dir(client['id'])
        file_path = os.path.join(upload_dir, file_entry['storage_name'])
        if os.path.exists(file_path):
            os.remove(file_path)

        # Update catalog
        catalog['files'] = [f for f in catalog['files'] if f['id'] != file_id]
        write_catalog(client['id'], catalog)

        return jsonify({'message': 'File deleted successfully'}), 200

    except Exception as e:
        print(f"Portal delete upload error: {e}")
        return jsonify({'error': str(e)}), 500


@client_portal_bp.route('/uploads/<file_id>/download', methods=['GET'])
@portal_auth_required
def download_upload(file_id):
    """Download an uploaded file."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        client = get_client_record(user_id)
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404

        catalog = read_catalog(client['id'])
        file_entry = next((f for f in catalog['files'] if f['id'] == file_id), None)

        if not file_entry:
            return jsonify({'error': 'File not found'}), 404

        upload_dir = get_upload_dir(client['id'])
        file_path = os.path.join(upload_dir, file_entry['storage_name'])

        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found on disk'}), 404

        return send_file(
            file_path,
            download_name=file_entry['filename'],
            as_attachment=True
        )

    except Exception as e:
        print(f"Portal download error: {e}")
        return jsonify({'error': str(e)}), 500


# ==========================================
# ADMIN: VIEW CLIENT UPLOADS (for admin dashboard)
# ==========================================

@client_portal_bp.route('/admin/uploads/<client_id>', methods=['GET'])
@portal_auth_required
def admin_list_client_uploads(client_id):
    """Admin endpoint: List uploads for a specific client."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        # Verify admin role
        admin = get_supabase_admin()
        profile = admin.table('profiles').select('role').eq('id', user_id).single().execute()
        if not profile.data or profile.data.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        catalog = read_catalog(client_id)
        return jsonify({'uploads': catalog.get('files', [])}), 200

    except Exception as e:
        print(f"Admin list uploads error: {e}")
        return jsonify({'error': str(e)}), 500


@client_portal_bp.route('/admin/uploads/<client_id>/<file_id>/download', methods=['GET'])
@portal_auth_required
def admin_download_upload(client_id, file_id):
    """Admin endpoint: Download a client's uploaded file."""
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        # Verify admin role
        admin = get_supabase_admin()
        profile = admin.table('profiles').select('role').eq('id', user_id).single().execute()
        if not profile.data or profile.data.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        catalog = read_catalog(client_id)
        file_entry = next((f for f in catalog['files'] if f['id'] == file_id), None)

        if not file_entry:
            return jsonify({'error': 'File not found'}), 404

        upload_dir = get_upload_dir(client_id)
        file_path = os.path.join(upload_dir, file_entry['storage_name'])

        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found on disk'}), 404

        return send_file(
            file_path,
            download_name=file_entry['filename'],
            as_attachment=True
        )

    except Exception as e:
        print(f"Admin download error: {e}")
        return jsonify({'error': str(e)}), 500
