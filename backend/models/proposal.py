from datetime import datetime
from extensions import db
import uuid

class Proposal(db.Model):
    __tablename__ = 'proposals'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey('templates.id'), nullable=False)
    template_version = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='draft')  # draft, sent, accepted, rejected
    resolved_content = db.Column(db.Text, nullable=True)  # snapshot with variables filled
    total_amount = db.Column(db.Float, nullable=True)
    public_token = db.Column(db.String(64), unique=True, nullable=True)  # for public link
    sent_at = db.Column(db.DateTime, nullable=True)
    responded_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    project = db.relationship('Project', backref='proposal', uselist=False)
    
    def generate_public_token(self):
        self.public_token = str(uuid.uuid4())
        return self.public_token
    
    def to_dict(self):
        return {
            'id': self.id,
            'client_id': self.client_id,
            'template_id': self.template_id,
            'template_version': self.template_version,
            'status': self.status,
            'resolved_content': self.resolved_content,
            'total_amount': self.total_amount,
            'public_token': self.public_token,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'responded_at': self.responded_at.isoformat() if self.responded_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
