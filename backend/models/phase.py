from datetime import datetime
from extensions import db
from models.milestone import Milestone

class Phase(db.Model):
    __tablename__ = 'phases'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)  # Onboarding, Strategy, Fulfilment, Reporting
    order_index = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(db.String(50), nullable=False, default='locked')  # locked, active, complete
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    milestones = db.relationship('Milestone', backref='phase', lazy='dynamic', order_by='Milestone.order_index')
    
    def activate(self):
        """Activate this phase and ensure only one phase is active per project."""
        # First, check if there's already an active phase
        from models.project import Project
        project = Project.query.get(self.project_id)
        active_phase = project.get_active_phase()
        
        if active_phase and active_phase.id != self.id:
            raise ValueError("Cannot activate phase: another phase is already active")
        
        self.status = 'active'
        # Activate the first milestone
        first_milestone = self.milestones.order_by(Milestone.order_index).first()
        if first_milestone:
            first_milestone.status = 'active'
    
    def complete(self):
        """Mark phase as complete and unlock next phase."""
        self.status = 'complete'
        
        # Find and unlock next phase
        from models.project import Project
        project = Project.query.get(self.project_id)
        next_phase = project.phases.filter(Phase.order_index > self.order_index).order_by(Phase.order_index).first()
        
        if next_phase:
            next_phase.activate()
        else:
            # All phases complete - project complete
            project.status = 'completed'
    
    def to_dict(self, include_milestones=False):
        data = {
            'id': self.id,
            'project_id': self.project_id,
            'name': self.name,
            'order_index': self.order_index,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_milestones:
            data['milestones'] = [m.to_dict(include_actions=True) for m in self.milestones.all()]
        return data
