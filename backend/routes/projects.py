from flask import Blueprint, request, jsonify
from routes.auth import supabase_auth_required, get_current_user_id
from supabase_client import get_supabase, get_supabase_admin
from routes.notifications import notify_client, notify_admins
from datetime import datetime

projects_bp = Blueprint('projects', __name__)

def get_user_organization_id(user_id):
    admin = get_supabase_admin()
    result = admin.table('organization_users').select('organization_id').eq('user_id', user_id).execute()
    return result.data[0]['organization_id'] if result.data else None

def get_user_role(user_id):
    admin = get_supabase_admin()
    result = admin.table('profiles').select('role').eq('id', user_id).single().execute()
    return result.data.get('role') if result.data else None

@projects_bp.route('/', methods=['GET'])
@supabase_auth_required
def get_projects():
    """Get all projects for the organization or client."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    org_id = get_user_organization_id(user_id)
    
    if not org_id:
        return jsonify({'error': 'Organization not found'}), 404
    
    admin = get_supabase_admin()
    status = request.args.get('status')
    
    if user_role == 'admin':
        query = admin.table('projects').select('*, clients(*)').eq('organization_id', org_id)
    else:
        # Client can only see their own projects
        client_result = admin.table('clients').select('id').eq('user_id', user_id).single().execute()
        if not client_result.data:
            return jsonify({'error': 'Client profile not found'}), 404
        query = admin.table('projects').select('*, clients(*)').eq('client_id', client_result.data['id'])
    
    if status:
        query = query.eq('status', status)
    
    result = query.order('created_at', desc=True).execute()
    
    projects = []
    for p in result.data or []:
        project = {**p}
        project['client'] = project.pop('clients', None)
        projects.append(project)
    
    return jsonify({'projects': projects}), 200


@projects_bp.route('/<project_id>', methods=['GET'])
@supabase_auth_required
def get_project(project_id):
    """Get a specific project with full details."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    org_id = get_user_organization_id(user_id)
    
    admin = get_supabase_admin()
    
    result = admin.table('projects').select('*, clients(*)').eq('id', project_id).single().execute()
    if not result.data or result.data.get('organization_id') != org_id:
        return jsonify({'error': 'Project not found'}), 404
    
    project = result.data
    
    # Clients can only view their own projects
    if user_role == 'client':
        client_result = admin.table('clients').select('id').eq('user_id', user_id).single().execute()
        if not client_result.data or project.get('client_id') != client_result.data['id']:
            return jsonify({'error': 'Access denied'}), 403
    
    # Get phases with milestones
    phases_result = admin.table('phases').select('*').eq('project_id', project_id).order('order_index').execute()
    phases = []
    for phase in phases_result.data or []:
        milestones_result = admin.table('milestones').select('*').eq('phase_id', phase['id']).order('order_index').execute()
        phase['milestones'] = milestones_result.data or []
        phases.append(phase)
    
    project['phases'] = phases
    project['client'] = project.pop('clients', None)
    
    # Get active phase
    active_phase = next((p for p in phases if p['status'] == 'active'), None)
    project['active_phase'] = active_phase
    
    return jsonify({'project': project}), 200


@projects_bp.route('/<project_id>/status', methods=['PUT'])
@supabase_auth_required
def update_project_status(project_id):
    """Update project status (pause/resume/complete)."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    
    if user_role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(user_id)
    
    admin = get_supabase_admin()
    
    project_result = admin.table('projects').select('*').eq('id', project_id).single().execute()
    if not project_result.data or project_result.data.get('organization_id') != org_id:
        return jsonify({'error': 'Project not found'}), 404
    
    data = request.get_json()
    new_status = data.get('status')
    
    if new_status not in ['active', 'paused', 'completed']:
        return jsonify({'error': 'Invalid status'}), 400
    
    admin.table('projects').update({'status': new_status}).eq('id', project_id).execute()
    
    # If completed, update client status
    if new_status == 'completed':
        admin.table('clients').update({'status': 'past'}).eq('id', project_result.data['client_id']).execute()
    
    updated = admin.table('projects').select('*').eq('id', project_id).single().execute()
    
    return jsonify({'project': updated.data}), 200


@projects_bp.route('/<project_id>/client-view', methods=['GET'])
@supabase_auth_required
def get_client_project_view(project_id):
    """Get simplified project view for client portal."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    org_id = get_user_organization_id(user_id)
    
    admin = get_supabase_admin()
    
    project_result = admin.table('projects').select('*').eq('id', project_id).single().execute()
    if not project_result.data or project_result.data.get('organization_id') != org_id:
        return jsonify({'error': 'Project not found'}), 404
    
    project = project_result.data
    
    # Verify client access
    if user_role == 'client':
        client_result = admin.table('clients').select('id').eq('user_id', user_id).single().execute()
        if not client_result.data or project.get('client_id') != client_result.data['id']:
            return jsonify({'error': 'Access denied'}), 403
    
    # Get phases
    phases_result = admin.table('phases').select('*').eq('project_id', project_id).order('order_index').execute()
    phases = phases_result.data or []
    
    active_phase = next((p for p in phases if p['status'] == 'active'), None)
    
    # Get current milestone info
    current_action = None
    if active_phase:
        milestones_result = admin.table('milestones').select('*').eq('phase_id', active_phase['id']).execute()
        active_milestones = [m for m in (milestones_result.data or []) if m.get('status') in ('pending', 'in_progress')]
        if active_milestones:
            m = active_milestones[0]
            current_action = {
                'milestone': m['title'],
                'status': m['status']
            }
    
    return jsonify({
        'project_name': project['name'],
        'status': project['status'],
        'current_phase': active_phase['name'] if active_phase else None,
        'current_action': current_action,
        'phases': [
            {
                'name': p['name'],
                'status': p['status'],
                'order': p['order_index']
            }
            for p in phases
        ]
    }), 200


# ==========================================
# MILESTONE & PHASE COMPLETION (Supabase)
# ==========================================

def complete_milestone_cascade(admin, milestone_id):
    """Complete a milestone and cascade: activate next milestone, or complete phase, or complete project.
    
    Returns dict with updated states for the response.
    """
    now = datetime.utcnow().isoformat()
    
    # Get the milestone
    milestone = admin.table('milestones').select('*').eq('id', milestone_id).single().execute().data
    if not milestone:
        return None
    
    # Mark milestone as completed
    admin.table('milestones').update({
        'status': 'completed',
        'completed_at': now
    }).eq('id', milestone_id).execute()
    
    phase_id = milestone['phase_id']
    
    # Get all milestones in this phase
    all_milestones = admin.table('milestones').select('*').eq('phase_id', phase_id).order('order_index').execute().data or []
    
    # Find the next pending milestone in this phase
    next_milestone = None
    for m in all_milestones:
        if m['id'] != milestone_id and m['status'] in ('pending',):
            next_milestone = m
            break
    
    result = {
        'milestone_completed': milestone['title'],
        'phase_completed': False,
        'project_completed': False,
        'next_milestone': None,
        'next_phase': None,
    }
    
    if next_milestone:
        # Activate the next milestone
        admin.table('milestones').update({
            'status': 'in_progress'
        }).eq('id', next_milestone['id']).execute()
        result['next_milestone'] = next_milestone['title']
    else:
        # All milestones in this phase are done — complete the phase
        admin.table('phases').update({
            'status': 'completed'
        }).eq('id', phase_id).execute()
        result['phase_completed'] = True
        
        # Get the phase to find its project
        phase = admin.table('phases').select('*').eq('id', phase_id).single().execute().data
        project_id = phase['project_id']
        
        # Get all phases for this project
        all_phases = admin.table('phases').select('*').eq('project_id', project_id).order('order_index').execute().data or []
        
        # Find the next pending phase
        next_phase = None
        for p in all_phases:
            if p['id'] != phase_id and p['status'] == 'pending':
                next_phase = p
                break
        
        if next_phase:
            # Activate the next phase
            admin.table('phases').update({
                'status': 'active'
            }).eq('id', next_phase['id']).execute()
            result['next_phase'] = next_phase['name']
            
            # Activate the first milestone in the new phase
            first_milestone = admin.table('milestones').select('*').eq('phase_id', next_phase['id']).order('order_index').limit(1).execute().data
            if first_milestone:
                admin.table('milestones').update({
                    'status': 'in_progress'
                }).eq('id', first_milestone[0]['id']).execute()
                result['next_milestone'] = first_milestone[0]['title']
        else:
            # No more phases — project is complete
            admin.table('projects').update({
                'status': 'completed'
            }).eq('id', project_id).execute()
            result['project_completed'] = True
    
    return result


@projects_bp.route('/<project_id>/milestones/<milestone_id>/complete', methods=['POST'])
@supabase_auth_required
def complete_milestone(project_id, milestone_id):
    """Manually complete a milestone (admin action). Cascades to next milestone/phase/project."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    
    if user_role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(user_id)
    admin = get_supabase_admin()
    
    # Verify project belongs to org
    project_result = admin.table('projects').select('*').eq('id', project_id).eq('organization_id', org_id).single().execute()
    if not project_result.data:
        return jsonify({'error': 'Project not found'}), 404
    
    # Verify milestone exists and belongs to this project
    milestone = admin.table('milestones').select('*, phases(project_id)').eq('id', milestone_id).single().execute()
    if not milestone.data or milestone.data.get('phases', {}).get('project_id') != project_id:
        return jsonify({'error': 'Milestone not found in this project'}), 404
    
    if milestone.data['status'] == 'completed':
        return jsonify({'error': 'Milestone already completed'}), 400
    
    result = complete_milestone_cascade(admin, milestone_id)
    
    # Notify client about milestone completion and phase changes
    client_id = project_result.data.get('client_id')
    if client_id and result:
        notify_client(
            client_id=client_id,
            organization_id=org_id,
            notification_type='milestone_completed',
            title='Milestone Completed',
            message=f'Milestone "{result["milestone_completed"]}" has been completed.',
            link='/portal/project',
            metadata={'project_id': project_id, 'milestone': result['milestone_completed']}
        )
        if result.get('next_phase'):
            notify_client(
                client_id=client_id,
                organization_id=org_id,
                notification_type='phase_activated',
                title='New Phase Started',
                message=f'Your project has moved to the "{result["next_phase"]}" phase.',
                link='/portal/project',
                metadata={'project_id': project_id, 'phase': result['next_phase']}
            )
        if result.get('project_completed'):
            notify_client(
                client_id=client_id,
                organization_id=org_id,
                notification_type='project_completed',
                title='Project Completed',
                message='Congratulations! Your project has been completed.',
                link='/portal/project',
                metadata={'project_id': project_id}
            )

    # Re-fetch the full project for the response
    updated_project = admin.table('projects').select('*').eq('id', project_id).single().execute()
    phases_result = admin.table('phases').select('*').eq('project_id', project_id).order('order_index').execute()
    phases = []
    for phase in (phases_result.data or []):
        ms = admin.table('milestones').select('*').eq('phase_id', phase['id']).order('order_index').execute()
        phase['milestones'] = ms.data or []
        phases.append(phase)
    
    project_data = updated_project.data
    project_data['phases'] = phases
    
    return jsonify({
        'project': project_data,
        'cascade': result,
        'message': f'Milestone "{result["milestone_completed"]}" completed successfully'
    }), 200


@projects_bp.route('/<project_id>/milestones/<milestone_id>/status', methods=['PUT'])
@supabase_auth_required
def update_milestone_status(project_id, milestone_id):
    """Update a milestone's status directly (admin). Used for custom status changes."""
    user_id = get_current_user_id()
    user_role = get_user_role(user_id)
    
    if user_role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(user_id)
    admin = get_supabase_admin()
    
    project_result = admin.table('projects').select('*').eq('id', project_id).eq('organization_id', org_id).single().execute()
    if not project_result.data:
        return jsonify({'error': 'Project not found'}), 404
    
    data = request.get_json()
    new_status = data.get('status')
    
    if new_status not in ['pending', 'in_progress', 'completed']:
        return jsonify({'error': 'Invalid status. Must be: pending, in_progress, completed'}), 400
    
    update_data = {'status': new_status}
    if new_status == 'completed':
        update_data['completed_at'] = datetime.utcnow().isoformat()
    
    admin.table('milestones').update(update_data).eq('id', milestone_id).execute()
    
    return jsonify({'message': 'Milestone status updated'}), 200
