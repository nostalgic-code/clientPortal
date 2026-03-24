from datetime import datetime
from extensions import db

class Project(db.Model):
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    proposal_id = db.Column(db.Integer, db.ForeignKey('proposals.id'), nullable=True)
    name = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='active')  # active, paused, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    phases = db.relationship('Phase', backref='project', lazy='dynamic', order_by='Phase.order_index')
    documents = db.relationship('Document', backref='project', lazy='dynamic')
    invoices = db.relationship('Invoice', backref='project', lazy='dynamic')
    reports = db.relationship('Report', backref='project', lazy='dynamic')
    
    def get_active_phase(self):
        return self.phases.filter_by(status='active').first()
    
    def to_dict(self, include_phases=False):
        data = {
            'id': self.id,
            'organization_id': self.organization_id,
            'client_id': self.client_id,
            'proposal_id': self.proposal_id,
            'name': self.name,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_phases:
            data['phases'] = [p.to_dict(include_milestones=True) for p in self.phases.all()]
        return data
