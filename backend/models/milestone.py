from datetime import datetime
from extensions import db
import json

class Milestone(db.Model):
    __tablename__ = 'milestones'
    
    id = db.Column(db.Integer, primary_key=True)
    phase_id = db.Column(db.Integer, db.ForeignKey('phases.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    order_index = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(db.String(50), nullable=False, default='locked')  # locked, active, complete
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    actions = db.relationship('MilestoneAction', backref='milestone', lazy='dynamic', order_by='MilestoneAction.id')
    artifacts = db.relationship('Artifact', backref='milestone', lazy='dynamic')
    
    def complete(self):
        """Mark milestone as complete and activate next milestone or complete phase."""
        self.status = 'complete'
        
        # Find next milestone in this phase
        from models.phase import Phase
        phase = Phase.query.get(self.phase_id)
        next_milestone = phase.milestones.filter(Milestone.order_index > self.order_index).order_by(Milestone.order_index).first()
        
        if next_milestone:
            next_milestone.status = 'active'
        else:
            # All milestones complete - complete the phase
            phase.complete()
    
    def check_completion(self):
        """Check if all actions are complete and auto-complete milestone if so."""
        pending_actions = self.actions.filter(MilestoneAction.status != 'complete').count()
        if pending_actions == 0 and self.actions.count() > 0:
            self.complete()
            return True
        return False
    
    def to_dict(self, include_actions=False):
        data = {
            'id': self.id,
            'phase_id': self.phase_id,
            'title': self.title,
            'description': self.description,
            'order_index': self.order_index,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_actions:
            data['actions'] = [a.to_dict() for a in self.actions.all()]
        return data


class MilestoneAction(db.Model):
    __tablename__ = 'milestone_actions'
    
    id = db.Column(db.Integer, primary_key=True)
    milestone_id = db.Column(db.Integer, db.ForeignKey('milestones.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # upload, sign, approve, schedule, pay
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    requirements = db.Column(db.Text, nullable=True)  # JSON
    status = db.Column(db.String(50), nullable=False, default='pending')  # pending, complete
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def get_requirements(self):
        if self.requirements:
            return json.loads(self.requirements)
        return {}
    
    def set_requirements(self, requirements_dict):
        self.requirements = json.dumps(requirements_dict)
    
    def complete(self):
        """Mark action as complete and check if milestone should be completed."""
        self.status = 'complete'
        self.completed_at = datetime.utcnow()
        
        # Check if milestone should auto-complete
        milestone = Milestone.query.get(self.milestone_id)
        milestone.check_completion()
    
    def to_dict(self):
        return {
            'id': self.id,
            'milestone_id': self.milestone_id,
            'type': self.type,
            'title': self.title,
            'description': self.description,
            'requirements': self.get_requirements(),
            'status': self.status,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
