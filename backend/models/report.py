from datetime import datetime
from extensions import db

class Report(db.Model):
    __tablename__ = 'reports'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    artifact_id = db.Column(db.Integer, db.ForeignKey('artifacts.id'), nullable=True)
    title = db.Column(db.String(255), nullable=False)
    period = db.Column(db.String(100), nullable=True)  # e.g., "2024-01", "Q1 2024"
    content = db.Column(db.Text, nullable=True)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    artifact = db.relationship('Artifact', backref='report', uselist=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'artifact_id': self.artifact_id,
            'title': self.title,
            'period': self.period,
            'content': self.content,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
