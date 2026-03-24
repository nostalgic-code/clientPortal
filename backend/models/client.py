from datetime import datetime
from extensions import db

class Client(db.Model):
    __tablename__ = 'clients'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Optional: linked user account
    name = db.Column(db.String(255), nullable=False)
    primary_contact_email = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='lead')  # lead, active, past
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='client_profile', uselist=False)
    proposals = db.relationship('Proposal', backref='client', lazy='dynamic')
    projects = db.relationship('Project', backref='client', lazy='dynamic')
    documents = db.relationship('Document', backref='client', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'user_id': self.user_id,
            'name': self.name,
            'primary_contact_email': self.primary_contact_email,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
