from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
from extensions import db
from models.user import User
from models.client import Client
from models.project import Project
from models.phase import Phase
from models.milestone import Milestone
from models.file import File, Artifact, ArtifactFile
from models.organization import OrganizationUser

files_bp = Blueprint('files', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'zip'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_user_organization_id(user_id):
    org_user = OrganizationUser.query.filter_by(user_id=user_id).first()
    return org_user.organization_id if org_user else None

@files_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    """Upload a file."""
    current_user_id = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    # Generate unique storage key
    storage_key = File.generate_storage_key()
    original_filename = secure_filename(file.filename)
    
    # Save file
    file_ext = original_filename.rsplit('.', 1)[1].lower()
    storage_filename = f"{storage_key}.{file_ext}"
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], storage_filename)
    file.save(file_path)
    
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Create file record
    file_record = File(
        storage_key=storage_key,
        original_filename=original_filename,
        mime_type=file.content_type,
        size=file_size,
        uploaded_by=current_user_id
    )
    
    db.session.add(file_record)
    db.session.commit()
    
    return jsonify({'file': file_record.to_dict()}), 201


@files_bp.route('/<int:file_id>', methods=['GET'])
@jwt_required()
def get_file_info(file_id):
    """Get file metadata."""
    current_user_id = get_jwt_identity()
    
    file_record = File.query.get(file_id)
    if not file_record:
        return jsonify({'error': 'File not found'}), 404
    
    return jsonify({'file': file_record.to_dict()}), 200


@files_bp.route('/<int:file_id>/download', methods=['GET'])
@jwt_required()
def download_file(file_id):
    """Download a file."""
    current_user_id = get_jwt_identity()
    
    file_record = File.query.get(file_id)
    if not file_record:
        return jsonify({'error': 'File not found'}), 404
    
    # Find the file in storage
    file_ext = file_record.original_filename.rsplit('.', 1)[1].lower()
    storage_filename = f"{file_record.storage_key}.{file_ext}"
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], storage_filename)
    
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found in storage'}), 404
    
    return send_file(
        file_path,
        download_name=file_record.original_filename,
        as_attachment=True
    )


@files_bp.route('/artifacts', methods=['POST'])
@jwt_required()
def create_artifact():
    """Create an artifact and attach a file."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    org_id = get_user_organization_id(current_user_id)
    
    data = request.get_json()
    
    required_fields = ['milestone_id', 'type', 'name', 'file_id']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    milestone = Milestone.query.get(data['milestone_id'])
    if not milestone:
        return jsonify({'error': 'Milestone not found'}), 404
    
    phase = Phase.query.get(milestone.phase_id)
    project = Project.query.get(phase.project_id)
    
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    # Clients can only add artifacts to their own projects
    if user.role == 'client':
        client = Client.query.filter_by(user_id=user.id).first()
        if not client or project.client_id != client.id:
            return jsonify({'error': 'Access denied'}), 403
    
    file_record = File.query.get(data['file_id'])
    if not file_record:
        return jsonify({'error': 'File not found'}), 404
    
    valid_types = ['agreement', 'report', 'asset', 'proposal']
    if data['type'] not in valid_types:
        return jsonify({'error': f'Invalid type. Must be one of: {valid_types}'}), 400
    
    # Create artifact
    artifact = Artifact(
        milestone_id=milestone.id,
        type=data['type'],
        name=data['name'],
        visibility=data.get('visibility', 'client')
    )
    db.session.add(artifact)
    db.session.flush()
    
    # Link file to artifact
    artifact_file = ArtifactFile(
        artifact_id=artifact.id,
        file_id=file_record.id,
        version=1
    )
    db.session.add(artifact_file)
    db.session.commit()
    
    return jsonify({'artifact': artifact.to_dict(include_files=True)}), 201


@files_bp.route('/artifacts/<int:artifact_id>', methods=['GET'])
@jwt_required()
def get_artifact(artifact_id):
    """Get an artifact."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    org_id = get_user_organization_id(current_user_id)
    
    artifact = Artifact.query.get(artifact_id)
    if not artifact:
        return jsonify({'error': 'Artifact not found'}), 404
    
    milestone = Milestone.query.get(artifact.milestone_id)
    phase = Phase.query.get(milestone.phase_id)
    project = Project.query.get(phase.project_id)
    
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    # Clients can only see client-visible artifacts on their projects
    if user.role == 'client':
        client = Client.query.filter_by(user_id=user.id).first()
        if not client or project.client_id != client.id:
            return jsonify({'error': 'Access denied'}), 403
        if artifact.visibility != 'client':
            return jsonify({'error': 'Access denied'}), 403
    
    return jsonify({'artifact': artifact.to_dict(include_files=True)}), 200


@files_bp.route('/artifacts/<int:artifact_id>/version', methods=['POST'])
@jwt_required()
def add_artifact_version(artifact_id):
    """Add a new version to an artifact."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(current_user_id)
    
    artifact = Artifact.query.get(artifact_id)
    if not artifact:
        return jsonify({'error': 'Artifact not found'}), 404
    
    milestone = Milestone.query.get(artifact.milestone_id)
    phase = Phase.query.get(milestone.phase_id)
    project = Project.query.get(phase.project_id)
    
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    if not data.get('file_id'):
        return jsonify({'error': 'file_id is required'}), 400
    
    file_record = File.query.get(data['file_id'])
    if not file_record:
        return jsonify({'error': 'File not found'}), 404
    
    # Get next version number
    latest = artifact.get_latest_file()
    next_version = (latest.version + 1) if latest else 1
    
    artifact_file = ArtifactFile(
        artifact_id=artifact.id,
        file_id=file_record.id,
        version=next_version
    )
    db.session.add(artifact_file)
    db.session.commit()
    
    return jsonify({'artifact': artifact.to_dict(include_files=True)}), 201


@files_bp.route('/milestone/<int:milestone_id>/artifacts', methods=['GET'])
@jwt_required()
def get_milestone_artifacts(milestone_id):
    """Get all artifacts for a milestone."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    org_id = get_user_organization_id(current_user_id)
    
    milestone = Milestone.query.get(milestone_id)
    if not milestone:
        return jsonify({'error': 'Milestone not found'}), 404
    
    phase = Phase.query.get(milestone.phase_id)
    project = Project.query.get(phase.project_id)
    
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    query = milestone.artifacts
    
    # Clients can only see client-visible artifacts
    if user.role == 'client':
        client = Client.query.filter_by(user_id=user.id).first()
        if not client or project.client_id != client.id:
            return jsonify({'error': 'Access denied'}), 403
        query = query.filter_by(visibility='client')
    
    artifacts = query.all()
    
    return jsonify({
        'artifacts': [a.to_dict(include_files=True) for a in artifacts]
    }), 200
