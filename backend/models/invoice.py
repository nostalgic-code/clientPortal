from datetime import datetime
from extensions import db

class Invoice(db.Model):
    __tablename__ = 'invoices'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=True)
    milestone_action_id = db.Column(db.Integer, db.ForeignKey('milestone_actions.id'), nullable=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    status = db.Column(db.String(50), nullable=False, default='unpaid')  # unpaid, paid, overdue, cancelled
    due_date = db.Column(db.DateTime, nullable=True)
    paid_at = db.Column(db.DateTime, nullable=True)
    issued_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    document = db.relationship('Document', backref='invoice', uselist=False)
    milestone_action = db.relationship('MilestoneAction', backref='invoice', uselist=False)
    
    @staticmethod
    def generate_invoice_number(organization_id):
        """Generate a unique invoice number."""
        from datetime import datetime
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        return f"INV-{organization_id}-{timestamp}"
    
    def mark_paid(self):
        """Mark invoice as paid and complete associated milestone action."""
        self.status = 'paid'
        self.paid_at = datetime.utcnow()
        
        # Complete the milestone action if linked
        if self.milestone_action:
            self.milestone_action.complete()
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'document_id': self.document_id,
            'milestone_action_id': self.milestone_action_id,
            'invoice_number': self.invoice_number,
            'amount': self.amount,
            'currency': self.currency,
            'status': self.status,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'issued_at': self.issued_at.isoformat() if self.issued_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
