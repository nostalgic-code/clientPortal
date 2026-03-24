from datetime import datetime
from extensions import db

class Organization(db.Model):
    __tablename__ = 'organizations'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    members = db.relationship('OrganizationUser', backref='organization', lazy='dynamic', cascade='all, delete-orphan')
    clients = db.relationship('Client', backref='organization', lazy='dynamic')
    templates = db.relationship('Template', backref='organization', lazy='dynamic')
    raw_uploads = db.relationship('RawTemplateUpload', backref='organization', lazy='dynamic')
    projects = db.relationship('Project', backref='organization', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'owner_id': self.owner_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class OrganizationUser(db.Model):
    __tablename__ = 'organization_users'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='client')  # admin, client
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('organization_id', 'user_id', name='unique_org_user'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'user_id': self.user_id,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
