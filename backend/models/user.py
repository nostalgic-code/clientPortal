from datetime import datetime
from extensions import db
import bcrypt

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='client')  # admin, client
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    owned_organizations = db.relationship('Organization', backref='owner', lazy='dynamic', foreign_keys='Organization.owner_id')
    organization_memberships = db.relationship('OrganizationUser', backref='user', lazy='dynamic')
    uploaded_files = db.relationship('File', backref='uploader', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
