from datetime import datetime
from extensions import db
import uuid

class File(db.Model):
    __tablename__ = 'files'
    
    id = db.Column(db.Integer, primary_key=True)
    storage_key = db.Column(db.String(255), unique=True, nullable=False)  # UUID or path
    original_filename = db.Column(db.String(255), nullable=False)
    mime_type = db.Column(db.String(100), nullable=True)
    size = db.Column(db.Integer, nullable=True)  # bytes
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    artifact_links = db.relationship('ArtifactFile', backref='file', lazy='dynamic')
    
    @staticmethod
    def generate_storage_key():
        return str(uuid.uuid4())
    
    def to_dict(self):
        return {
            'id': self.id,
            'storage_key': self.storage_key,
            'original_filename': self.original_filename,
            'mime_type': self.mime_type,
            'size': self.size,
            'uploaded_by': self.uploaded_by,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }


class Artifact(db.Model):
    __tablename__ = 'artifacts'
    
    id = db.Column(db.Integer, primary_key=True)
    milestone_id = db.Column(db.Integer, db.ForeignKey('milestones.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # agreement, report, asset, proposal
    name = db.Column(db.String(255), nullable=False)
    visibility = db.Column(db.String(50), nullable=False, default='client')  # client, internal
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    files = db.relationship('ArtifactFile', backref='artifact', lazy='dynamic', order_by='ArtifactFile.version.desc()')
    
    def get_latest_file(self):
        return self.files.order_by(ArtifactFile.version.desc()).first()
    
    def to_dict(self, include_files=False):
        data = {
            'id': self.id,
            'milestone_id': self.milestone_id,
            'type': self.type,
            'name': self.name,
            'visibility': self.visibility,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_files:
            data['files'] = [af.to_dict() for af in self.files.all()]
        return data


class ArtifactFile(db.Model):
    __tablename__ = 'artifact_files'
    
    id = db.Column(db.Integer, primary_key=True)
    artifact_id = db.Column(db.Integer, db.ForeignKey('artifacts.id'), nullable=False)
    file_id = db.Column(db.Integer, db.ForeignKey('files.id'), nullable=False)
    version = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('artifact_id', 'version', name='unique_artifact_version'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'artifact_id': self.artifact_id,
            'file_id': self.file_id,
            'version': self.version,
            'file': self.file.to_dict() if self.file else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
