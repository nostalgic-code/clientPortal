from datetime import datetime
from extensions import db

class Document(db.Model):
    __tablename__ = 'documents'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey('templates.id'), nullable=True)
    template_version = db.Column(db.Integer, nullable=True)
    type = db.Column(db.String(50), nullable=False)  # proposal, agreement, invoice, letter
    status = db.Column(db.String(50), nullable=False, default='draft')  # draft, sent, signed, paid
    resolved_content = db.Column(db.Text, nullable=True)  # Final rendered content
    signed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'client_id': self.client_id,
            'template_id': self.template_id,
            'template_version': self.template_version,
            'type': self.type,
            'status': self.status,
            'resolved_content': self.resolved_content,
            'signed_at': self.signed_at.isoformat() if self.signed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
