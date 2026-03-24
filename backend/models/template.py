from datetime import datetime
from extensions import db
import json

class RawTemplateUpload(db.Model):
    __tablename__ = 'raw_template_uploads'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    file_id = db.Column(db.Integer, db.ForeignKey('files.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # proposal, agreement, invoice, letter
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    file = db.relationship('File', backref='raw_upload', uselist=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'file_id': self.file_id,
            'type': self.type,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }


class Template(db.Model):
    __tablename__ = 'templates'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # proposal, agreement, invoice, letter
    source = db.Column(db.String(50), nullable=False, default='native')  # native, imported
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    versions = db.relationship('TemplateVersion', backref='template', lazy='dynamic', order_by='TemplateVersion.version_number.desc()')
    proposals = db.relationship('Proposal', backref='template', lazy='dynamic')
    documents = db.relationship('Document', backref='template', lazy='dynamic')
    
    def get_latest_version(self):
        return self.versions.order_by(TemplateVersion.version_number.desc()).first()
    
    def to_dict(self, include_versions=False):
        data = {
            'id': self.id,
            'organization_id': self.organization_id,
            'name': self.name,
            'type': self.type,
            'source': self.source,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_versions:
            data['versions'] = [v.to_dict() for v in self.versions.all()]
        return data


class TemplateVersion(db.Model):
    __tablename__ = 'template_versions'
    
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('templates.id'), nullable=False)
    version_number = db.Column(db.Integer, nullable=False, default=1)
    content = db.Column(db.Text, nullable=False)  # HTML or Markdown
    variables = db.Column(db.Text, nullable=True)  # JSON: { client_name, price, timeline }
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('template_id', 'version_number', name='unique_template_version'),
    )
    
    def get_variables(self):
        if self.variables:
            return json.loads(self.variables)
        return {}
    
    def set_variables(self, variables_dict):
        self.variables = json.dumps(variables_dict)
    
    def to_dict(self):
        return {
            'id': self.id,
            'template_id': self.template_id,
            'version_number': self.version_number,
            'content': self.content,
            'variables': self.get_variables(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
