from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from extensions import db
from models.user import User
from models.client import Client
from models.project import Project
from models.report import Report
from models.file import Artifact
from models.organization import OrganizationUser

reports_bp = Blueprint('reports', __name__)

def get_user_organization_id(user_id):
    org_user = OrganizationUser.query.filter_by(user_id=user_id).first()
    return org_user.organization_id if org_user else None

@reports_bp.route('/', methods=['GET'])
@jwt_required()
def get_reports():
    """Get all reports for the organization or client."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    org_id = get_user_organization_id(current_user_id)
    
    if not org_id:
        return jsonify({'error': 'Organization not found'}), 404
    
    project_id = request.args.get('project_id', type=int)
    
    if user.role == 'admin':
        project_ids = [p.id for p in Project.query.filter_by(organization_id=org_id).all()]
        query = Report.query.filter(Report.project_id.in_(project_ids))
    else:
        client = Client.query.filter_by(user_id=user.id).first()
        if not client:
            return jsonify({'error': 'Client profile not found'}), 404
        project_ids = [p.id for p in client.projects.all()]
        query = Report.query.filter(Report.project_id.in_(project_ids))
    
    if project_id:
        query = query.filter_by(project_id=project_id)
    
    reports = query.order_by(Report.generated_at.desc()).all()
    
    result = []
    for r in reports:
        data = r.to_dict()
        data['project'] = r.project.to_dict() if r.project else None
        result.append(data)
    
    return jsonify({'reports': result}), 200


@reports_bp.route('/<int:report_id>', methods=['GET'])
@jwt_required()
def get_report(report_id):
    """Get a specific report."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    org_id = get_user_organization_id(current_user_id)
    
    report = Report.query.get(report_id)
    if not report:
        return jsonify({'error': 'Report not found'}), 404
    
    project = Project.query.get(report.project_id)
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    if user.role == 'client':
        client = Client.query.filter_by(user_id=user.id).first()
        if not client or project.client_id != client.id:
            return jsonify({'error': 'Access denied'}), 403
    
    data = report.to_dict()
    data['project'] = project.to_dict()
    if report.artifact:
        data['artifact'] = report.artifact.to_dict(include_files=True)
    
    return jsonify({'report': data}), 200


@reports_bp.route('/', methods=['POST'])
@jwt_required()
def create_report():
    """Create a new report."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(current_user_id)
    
    data = request.get_json()
    
    required_fields = ['project_id', 'title']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    project = Project.query.get(data['project_id'])
    if not project or project.organization_id != org_id:
        return jsonify({'error': 'Project not found'}), 404
    
    # Validate artifact if provided
    artifact_id = data.get('artifact_id')
    if artifact_id:
        artifact = Artifact.query.get(artifact_id)
        if not artifact:
            return jsonify({'error': 'Artifact not found'}), 404
    
    report = Report(
        project_id=project.id,
        artifact_id=artifact_id,
        title=data['title'],
        period=data.get('period'),
        content=data.get('content'),
        generated_at=datetime.utcnow()
    )
    
    db.session.add(report)
    db.session.commit()
    
    return jsonify({'report': report.to_dict()}), 201


@reports_bp.route('/<int:report_id>', methods=['PUT'])
@jwt_required()
def update_report(report_id):
    """Update a report."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(current_user_id)
    
    report = Report.query.get(report_id)
    if not report:
        return jsonify({'error': 'Report not found'}), 404
    
    project = Project.query.get(report.project_id)
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    if 'title' in data:
        report.title = data['title']
    if 'period' in data:
        report.period = data['period']
    if 'content' in data:
        report.content = data['content']
    if 'artifact_id' in data:
        report.artifact_id = data['artifact_id']
    
    db.session.commit()
    
    return jsonify({'report': report.to_dict()}), 200


@reports_bp.route('/<int:report_id>', methods=['DELETE'])
@jwt_required()
def delete_report(report_id):
    """Delete a report."""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    org_id = get_user_organization_id(current_user_id)
    
    report = Report.query.get(report_id)
    if not report:
        return jsonify({'error': 'Report not found'}), 404
    
    project = Project.query.get(report.project_id)
    if project.organization_id != org_id:
        return jsonify({'error': 'Access denied'}), 403
    
    db.session.delete(report)
    db.session.commit()
    
    return jsonify({'message': 'Report deleted successfully'}), 200
