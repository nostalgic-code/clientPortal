from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.user import User
from models.client import Client
from models.project import Project
from models.phase import Phase
from models.milestone import Milestone, MilestoneAction
from models.organization import OrganizationUser

phases_bp = Blueprint('phases', __name__)

def get_user_organization_id(user_id):
    org_user = OrganizationUser.query.filter_by(user_id=user_id).first()
    return org_user.organization_id if org_user else None

@phases_bp.route('/project/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project_phases(project_id):
    """Get all phases for a project."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    org_id = get_user_organization_id(current_user_id)
    
    project = Project.query.get(project_id)
    if not project or project.organization_id != org_id:
        return jsonify({'error': 'Project not found'}), 404
    
    # Clients can only view their own projects
    if user.role == 'client':
        client = Client.query.filter_by(user_id=user.id).first()
        if not client or project.client_id != client.id:
            return jsonify({'error': 'Access denied'}), 403
    
    phases = project.phases.order_by(Phase.order_index).all()
    
    return jsonify({
        'phases': [p.to_dict(include_milestones=True) for p in phases]
    }), 200


@phases_bp.route('/<int:phase_id>', methods=['GET'])
@jwt_required()
def get_phase(phase_id):
    """Get a specific phase."""
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
    
    return jsonify({'phase': phase.to_dict(include_milestones=True)}), 200


@phases_bp.route('/project/<int:project_id>', methods=['POST'])
@jwt_required()
def create_phase(project_id):
    """Create a new phase for a project."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(current_user_id)
    
    project = Project.query.get(project_id)
    if not project or project.organization_id != org_id:
        return jsonify({'error': 'Project not found'}), 404
    
    data = request.get_json()
    
    if not data.get('name'):
        return jsonify({'error': 'name is required'}), 400
    
    # Get next order index
    last_phase = project.phases.order_by(Phase.order_index.desc()).first()
    next_order = (last_phase.order_index + 1) if last_phase else 0
    
    phase = Phase(
        project_id=project.id,
        name=data['name'],
        order_index=data.get('order_index', next_order),
        status='locked'  # New phases start locked
    )
    
    db.session.add(phase)
    db.session.commit()
    
    return jsonify({'phase': phase.to_dict()}), 201


@phases_bp.route('/<int:phase_id>', methods=['PUT'])
@jwt_required()
def update_phase(phase_id):
    """Update a phase."""
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
    
    if 'name' in data:
        phase.name = data['name']
    if 'order_index' in data:
        phase.order_index = data['order_index']
    
    db.session.commit()
    
    return jsonify({'phase': phase.to_dict(include_milestones=True)}), 200


@phases_bp.route('/<int:phase_id>/activate', methods=['POST'])
@jwt_required()
def activate_phase(phase_id):
    """Manually activate a phase (admin only)."""
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
    
    # Check if there's already an active phase
    active_phase = project.get_active_phase()
    if active_phase and active_phase.id != phase.id:
        return jsonify({'error': 'Another phase is already active. Complete it first.'}), 400
    
    try:
        phase.activate()
        db.session.commit()
        return jsonify({'phase': phase.to_dict(include_milestones=True)}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
