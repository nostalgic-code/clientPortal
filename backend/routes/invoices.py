from flask import Blueprint, request, jsonify
from routes.auth import supabase_auth_required, get_current_user_id
from supabase_client import get_supabase, get_supabase_admin
from routes.notifications import notify_client
from datetime import datetime, timedelta

invoices_bp = Blueprint('invoices', __name__)

def get_user_organization_id(user_id):
    admin = get_supabase_admin()
    result = admin.table('organization_users').select('organization_id').eq('user_id', user_id).execute()
    return result.data[0]['organization_id'] if result.data else None

def get_user_role(user_id):
    admin = get_supabase_admin()
    result = admin.table('profiles').select('role').eq('id', user_id).single().execute()
    return result.data.get('role') if result.data else None

def generate_invoice_number(org_id):
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    return f"INV-{org_id}-{timestamp}"

@invoices_bp.route('/', methods=['GET'])
@supabase_auth_required
def get_invoices():
    """Get all invoices for the organization or client."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    org_id = get_user_organization_id(user_id)
    
    if not org_id:
        return jsonify({'error': 'Organization not found'}), 404
    
    admin = get_supabase_admin()
    project_id = request.args.get('project_id', type=int)
    status = request.args.get('status')
    
    if user_role == 'admin':
        # Get all project IDs for this org
        projects_result = admin.table('projects').select('id').eq('organization_id', org_id).execute()
        project_ids = [p['id'] for p in projects_result.data or []]
    else:
        # Get client's project IDs
        client_result = admin.table('clients').select('id').eq('user_id', user_id).single().execute()
        if not client_result.data:
            return jsonify({'error': 'Client profile not found'}), 404
        projects_result = admin.table('projects').select('id').eq('client_id', client_result.data['id']).execute()
        project_ids = [p['id'] for p in projects_result.data or []]
    
    if not project_ids:
        return jsonify({'invoices': []}), 200
    
    # Get invoices with project info
    query = admin.table('invoices').select('*, projects(*)').in_('project_id', project_ids)
    
    if project_id:
        query = query.eq('project_id', project_id)
    if status:
        query = query.eq('status', status)
    
    result = query.order('created_at', desc=True).execute()
    
    invoices = []
    for inv in result.data or []:
        invoice = {**inv}
        invoice['project'] = invoice.pop('projects', None)
        invoices.append(invoice)
    
    return jsonify({'invoices': invoices}), 200


@invoices_bp.route('/<invoice_id>', methods=['GET'])
@supabase_auth_required
def get_invoice(invoice_id):
    """Get a specific invoice."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    org_id = get_user_organization_id(user_id)
    
    admin = get_supabase_admin()
    
    result = admin.table('invoices').select('*, projects(*)').eq('id', invoice_id).single().execute()
    if not result.data:
        return jsonify({'error': 'Invoice not found'}), 404
    
    invoice = result.data
    project = invoice.get('projects')
    
    if not project or project.get('organization_id') != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    if user_role == 'client':
        client_result = admin.table('clients').select('id').eq('user_id', user_id).single().execute()
        if not client_result.data or project.get('client_id') != client_result.data['id']:
            return jsonify({'error': 'Access denied'}), 403
    
    invoice['project'] = invoice.pop('projects', None)
    
    return jsonify({'invoice': invoice}), 200


@invoices_bp.route('/', methods=['POST'])
@supabase_auth_required
def create_invoice():
    """Create a new invoice."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    
    if user_role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(user_id)
    
    data = request.get_json()
    
    required_fields = ['project_id']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    # Need at least subtotal or total
    subtotal = data.get('subtotal') or data.get('amount') or 0
    if not subtotal:
        return jsonify({'error': 'subtotal (or amount) is required'}), 400
    
    admin = get_supabase_admin()
    
    # Verify project belongs to org and get client_id
    project_result = admin.table('projects').select('id, organization_id, client_id').eq('id', data['project_id']).single().execute()
    if not project_result.data or project_result.data.get('organization_id') != org_id:
        return jsonify({'error': 'Project not found'}), 404
    
    project = project_result.data
    
    # Generate invoice number
    invoice_number = generate_invoice_number(org_id)
    
    # Calculate due date (default 30 days)
    due_days = data.get('due_days', 30)
    due_date = (datetime.utcnow() + timedelta(days=due_days)).isoformat()
    
    # Calculate totals
    tax_rate = data.get('tax_rate', 0)
    tax_amount = round(subtotal * (tax_rate / 100), 2)
    discount_amount = data.get('discount_amount', 0)
    total = subtotal + tax_amount - discount_amount
    
    invoice_data = {
        'organization_id': org_id,
        'project_id': data['project_id'],
        'client_id': data.get('client_id') or project.get('client_id'),
        'document_id': data.get('document_id'),
        'invoice_number': invoice_number,
        'subtotal': subtotal,
        'tax_rate': tax_rate,
        'tax_amount': tax_amount,
        'discount_amount': discount_amount,
        'total': total,
        'currency': data.get('currency', 'ZAR'),
        'status': 'sent',
        'issue_date': datetime.utcnow().isoformat(),
        'due_date': due_date
    }
    
    result = admin.table('invoices').insert(invoice_data).execute()
    
    # Notify client about new invoice
    created_invoice = result.data[0] if result.data else None
    client_id = invoice_data.get('client_id')
    if created_invoice and client_id:
        notify_client(
            client_id=client_id,
            organization_id=org_id,
            notification_type='invoice_created',
            title='New Invoice',
            message=f'You have a new invoice ({created_invoice.get("invoice_number", "")}) for {created_invoice.get("currency", "ZAR")} {created_invoice.get("total", 0):.2f}',
            link='/portal/invoices',
            metadata={'invoice_id': created_invoice['id'], 'amount': created_invoice.get('total')}
        )
    
    return jsonify({'invoice': created_invoice}), 201


@invoices_bp.route('/<invoice_id>/pay', methods=['POST'])
@supabase_auth_required
def mark_invoice_paid(invoice_id):
    """Mark an invoice as paid."""
    user_id = get_current_user_id()
    org_id = get_user_organization_id(user_id)
    
    admin = get_supabase_admin()
    
    result = admin.table('invoices').select('*, projects(organization_id)').eq('id', invoice_id).single().execute()
    if not result.data:
        return jsonify({'error': 'Invoice not found'}), 404
    
    invoice = result.data
    
    if invoice.get('projects', {}).get('organization_id') != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    if invoice.get('status') == 'paid':
        return jsonify({'error': 'Invoice already paid'}), 400
    
    if invoice.get('status') == 'cancelled':
        return jsonify({'error': 'Cannot pay cancelled invoice'}), 400
    
    # Update invoice
    update_result = admin.table('invoices').update({
        'status': 'paid',
        'paid_at': datetime.utcnow().isoformat()
    }).eq('id', invoice_id).execute()
    
    # Auto-complete "Invoice Payment" milestone for the client
    client_id = invoice.get('client_id')
    if client_id:
        try:
            from routes.projects import complete_milestone_cascade
            # Find client's active project and the Invoice Payment milestone
            project_result = admin.table('projects').select('id').eq('client_id', client_id).eq('status', 'active').order('created_at', desc=True).limit(1).execute()
            if project_result.data:
                project_id = project_result.data[0]['id']
                phases = admin.table('phases').select('id').eq('project_id', project_id).execute().data or []
                for phase in phases:
                    milestones = admin.table('milestones').select('id, title, status').eq('phase_id', phase['id']).execute().data or []
                    for m in milestones:
                        if 'invoice' in m['title'].lower() and 'pay' in m['title'].lower() and m['status'] in ('pending', 'in_progress'):
                            print(f"[AUTO-COMPLETE] Completing milestone '{m['title']}' on invoice payment")
                            complete_milestone_cascade(admin, m['id'])
                            break
        except Exception as e:
            print(f"[AUTO-COMPLETE] Error on invoice payment: {e}")
    
    return jsonify({'invoice': update_result.data[0] if update_result.data else None}), 200


@invoices_bp.route('/<invoice_id>/cancel', methods=['POST'])
@supabase_auth_required
def cancel_invoice(invoice_id):
    """Cancel an invoice."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    
    if user_role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(user_id)
    
    admin = get_supabase_admin()
    
    result = admin.table('invoices').select('*, projects(organization_id)').eq('id', invoice_id).single().execute()
    if not result.data:
        return jsonify({'error': 'Invoice not found'}), 404
    
    invoice = result.data
    
    if invoice.get('projects', {}).get('organization_id') != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    if invoice.get('status') == 'paid':
        return jsonify({'error': 'Cannot cancel paid invoice'}), 400
    
    update_result = admin.table('invoices').update({'status': 'cancelled'}).eq('id', invoice_id).execute()
    
    return jsonify({'invoice': update_result.data[0] if update_result.data else None}), 200
