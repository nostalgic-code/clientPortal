from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.user import User
from models.client import Client
from models.project import Project
from models.document import Document
from models.organization import OrganizationUser
from datetime import datetime

documents_bp = Blueprint('documents', __name__)

def get_user_organization_id(user_id):
    org_user = OrganizationUser.query.filter_by(user_id=user_id).first()
    return org_user.organization_id if org_user else None

@documents_bp.route('/', methods=['GET'])
@jwt_required()
def get_documents():
    """Get all documents for the organization or client."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    org_id = get_user_organization_id(current_user_id)
    
    if not org_id:
        return jsonify({'error': 'Organization not found'}), 404
    
    project_id = request.args.get('project_id', type=int)
    doc_type = request.args.get('type')
    status = request.args.get('status')
    
    if user.role == 'admin':
        # Get all projects in org
        project_ids = [p.id for p in Project.query.filter_by(organization_id=org_id).all()]
        query = Document.query.filter(Document.project_id.in_(project_ids))
    else:
        # Client can only see their own documents
        client = Client.query.filter_by(user_id=user.id).first()
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404
        query = Document.query.filter_by(client_id=client.id)
    
    if project_id:
        query = query.filter_by(project_id=project_id)
    if doc_type:
        query = query.filter_by(type=doc_type)
    if status:
        query = query.filter_by(status=status)
    
    documents = query.order_by(Document.created_at.desc()).all()
    
    return jsonify({'documents': [d.to_dict() for d in documents]}), 200


@documents_bp.route('/<int:document_id>', methods=['GET'])
@jwt_required()
def get_document(document_id):
    """Get a specific document."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    org_id = get_user_organization_id(current_user_id)
    
    document = Document.query.get(document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    project = Project.query.get(document.project_id)
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    if user.role == 'client':
        client = Client.query.filter_by(user_id=user.id).first()
        if not client or document.client_id != client.id:
            return jsonify({'error': 'Access denied'}), 403
    
    return jsonify({'document': document.to_dict()}), 200


@documents_bp.route('/', methods=['POST'])
@jwt_required()
def create_document():
    """Create a new document."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(current_user_id)
    
    data = request.get_json()
    
    required_fields = ['project_id', 'type']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    project = Project.query.get(data['project_id'])
    if not project or project.organization_id != org_id:
        return jsonify({'error': 'Project not found'}), 404
    
    valid_types = ['proposal', 'agreement', 'invoice', 'letter']
    if data['type'] not in valid_types:
        return jsonify({'error': f'Invalid type. Must be one of: {valid_types}'}), 400
    
    document = Document(
        project_id=project.id,
        client_id=project.client_id,
        template_id=data.get('template_id'),
        template_version=data.get('template_version'),
        type=data['type'],
        status='draft',
        resolved_content=data.get('content')
    )
    
    db.session.add(document)
    db.session.commit()
    
    return jsonify({'document': document.to_dict()}), 201


@documents_bp.route('/<int:document_id>', methods=['PUT'])
@jwt_required()
def update_document(document_id):
    """Update a document."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(current_user_id)
    
    document = Document.query.get(document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    project = Project.query.get(document.project_id)
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    if 'content' in data:
        document.resolved_content = data['content']
    if 'status' in data:
        document.status = data['status']
    
    db.session.commit()
    
    return jsonify({'document': document.to_dict()}), 200


@documents_bp.route('/<int:document_id>/sign', methods=['POST'])
@jwt_required()
def sign_document(document_id):
    """Sign a document (client action)."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    org_id = get_user_organization_id(current_user_id)
    
    document = Document.query.get(document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    project = Project.query.get(document.project_id)
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    # Clients can only sign their own documents
    if user.role == 'client':
        client = Client.query.filter_by(user_id=user.id).first()
        if not client or document.client_id != client.id:
            return jsonify({'error': 'Access denied'}), 403
    
    if document.status != 'sent':
        return jsonify({'error': 'Document must be in sent status to sign'}), 400
    
    document.status = 'signed'
    document.signed_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({'document': document.to_dict()}), 200
