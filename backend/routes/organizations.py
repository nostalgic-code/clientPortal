from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.user import User
from models.organization import Organization, OrganizationUser

organizations_bp = Blueprint('organizations', __name__)

def get_user_organization(user_id):
    """Get the organization for a user."""
    org_user = OrganizationUser.query.filter_by(user_id=user_id).first()
    if not org_user:
        return None
    return Organization.query.get(org_user.organization_id)

@organizations_bp.route('/', methods=['GET'])
@jwt_required()
def get_organization():
    """Get current user's organization."""
    current_user_id = get_jwt_identity()
    organization = get_user_organization(current_user_id)
    
    if not organization:
        return jsonify({'error': 'Organization not found'}), 404
    
    return jsonify({'organization': organization.to_dict()}), 200


@organizations_bp.route('/', methods=['PUT'])
@jwt_required()
def update_organization():
    """Update organization details."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    organization = get_user_organization(current_user_id)
    if not organization:
        return jsonify({'error': 'Organization not found'}), 404
    
    data = request.get_json()
    
    if 'name' in data:
        organization.name = data['name']
    
    db.session.commit()
    
    return jsonify({'organization': organization.to_dict()}), 200


@organizations_bp.route('/members', methods=['GET'])
@jwt_required()
def get_members():
    """Get all members of the organization."""
    current_user_id = get_jwt_identity()
    organization = get_user_organization(current_user_id)
    
    if not organization:
        return jsonify({'error': 'Organization not found'}), 404
    
    members = OrganizationUser.query.filter_by(organization_id=organization.id).all()
    result = []
    
    for member in members:
        user = User.query.get(member.user_id)
        result.append({
            'id': member.id,
            'user': user.to_dict(),
            'role': member.role,
            'created_at': member.created_at.isoformat() if member.created_at else None
        })
    
    return jsonify({'members': result}), 200
