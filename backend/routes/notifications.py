"""
Notification helpers — create notifications for admin and client events.

Usage:
    from routes.notifications import create_notification, notify_admin, notify_client

Notification types:
    ADMIN receives:
        - proposal_accepted      : client accepted a proposal
        - proposal_rejected      : client rejected a proposal
        - document_signed        : client signed an agreement
        - document_viewed        : client viewed a document
        - file_uploaded          : client uploaded a resource file
        - milestone_auto_completed : a milestone was auto-completed by the system

    CLIENT receives:
        - proposal_sent          : admin sent a proposal
        - document_sent          : admin sent a document
        - invoice_created        : admin created an invoice
        - milestone_completed    : admin manually completed a milestone
        - phase_activated        : a new phase was activated
"""

from flask import Blueprint, request, jsonify
from functools import wraps
from supabase_client import get_supabase_admin
from datetime import datetime

notifications_bp = Blueprint('notifications', __name__)


# ==========================================
# HELPERS
# ==========================================

def _get_current_user_id():
    from jose import jwt as jose_jwt
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    token = auth_header.replace('Bearer ', '')
    try:
        payload = jose_jwt.get_unverified_claims(token)
        return payload.get('sub')
    except Exception:
        return None


def _get_user_organization_id(user_id):
    admin = get_supabase_admin()
    result = admin.table('organization_users').select('organization_id').eq('user_id', user_id).limit(1).execute()
    return result.data[0]['organization_id'] if result.data else None


def _supabase_auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        return f(*args, **kwargs)
    return decorated


# ==========================================
# NOTIFICATION CREATION (called from other routes)
# ==========================================

def create_notification(user_id, organization_id, notification_type, title, message, link=None, metadata=None):
    """Create a single notification for a user."""
    try:
        admin = get_supabase_admin()
        data = {
            'user_id': user_id,
            'organization_id': organization_id,
            'type': notification_type,
            'title': title,
            'message': message,
            'link': link,
            'is_read': False,
            'metadata': metadata or {},
        }
        admin.table('notifications').insert(data).execute()
        print(f"[NOTIFICATION] Created '{notification_type}' for user {user_id[:8]}...")
    except Exception as e:
        # Never let notification failures break the main flow
        print(f"[NOTIFICATION] Error creating notification: {e}")


def notify_admins(organization_id, notification_type, title, message, link=None, metadata=None):
    """Send a notification to all admins in an organization."""
    try:
        admin = get_supabase_admin()
        # Get all admin users in this org
        org_users = admin.table('organization_users').select('user_id').eq('organization_id', organization_id).eq('role', 'admin').execute()
        # Also get the owner
        org = admin.table('organizations').select('owner_id').eq('id', organization_id).single().execute()

        admin_user_ids = set()
        for ou in (org_users.data or []):
            admin_user_ids.add(ou['user_id'])
        if org.data:
            admin_user_ids.add(org.data['owner_id'])

        for uid in admin_user_ids:
            create_notification(uid, organization_id, notification_type, title, message, link, metadata)
    except Exception as e:
        print(f"[NOTIFICATION] Error notifying admins: {e}")


def notify_client(client_id, organization_id, notification_type, title, message, link=None, metadata=None):
    """Send a notification to a client (by client record ID, not user_id)."""
    try:
        admin = get_supabase_admin()
        client = admin.table('clients').select('user_id').eq('id', client_id).single().execute()
        if client.data and client.data.get('user_id'):
            create_notification(client.data['user_id'], organization_id, notification_type, title, message, link, metadata)
        else:
            print(f"[NOTIFICATION] Client {client_id} has no user_id, skipping notification")
    except Exception as e:
        print(f"[NOTIFICATION] Error notifying client: {e}")


# ==========================================
# API ENDPOINTS
# ==========================================

@notifications_bp.route('/', methods=['GET'])
@_supabase_auth_required
def get_notifications():
    """Get notifications for the current user. Supports ?unread_only=true and ?limit=N."""
    try:
        user_id = _get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        admin = get_supabase_admin()

        limit = request.args.get('limit', 50, type=int)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'

        query = admin.table('notifications').select('*').eq('user_id', user_id)

        if unread_only:
            query = query.eq('is_read', False)

        result = query.order('created_at', desc=True).limit(limit).execute()

        # Also get unread count
        count_result = admin.table('notifications').select('id', count='exact').eq('user_id', user_id).eq('is_read', False).execute()
        unread_count = count_result.count if hasattr(count_result, 'count') and count_result.count is not None else len([n for n in (result.data or []) if not n.get('is_read')])

        return jsonify({
            'notifications': result.data or [],
            'unread_count': unread_count,
        }), 200

    except Exception as e:
        print(f"Error fetching notifications: {e}")
        # Return empty data if table doesn't exist yet
        if 'PGRST205' in str(e) or 'notifications' in str(e).lower() and 'not found' in str(e).lower():
            return jsonify({'notifications': [], 'unread_count': 0}), 200
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/unread-count', methods=['GET'])
@_supabase_auth_required
def get_unread_count():
    """Get just the unread notification count (lightweight endpoint for polling)."""
    try:
        user_id = _get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        admin = get_supabase_admin()
        result = admin.table('notifications').select('id', count='exact').eq('user_id', user_id).eq('is_read', False).execute()
        count = result.count if hasattr(result, 'count') and result.count is not None else 0

        return jsonify({'unread_count': count}), 200

    except Exception as e:
        print(f"Error fetching unread count: {e}")
        if 'PGRST205' in str(e) or 'notifications' in str(e).lower() and 'not found' in str(e).lower():
            return jsonify({'unread_count': 0}), 200
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/<notification_id>/read', methods=['POST'])
@_supabase_auth_required
def mark_as_read(notification_id):
    """Mark a single notification as read."""
    try:
        user_id = _get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        admin = get_supabase_admin()
        result = admin.table('notifications').update({'is_read': True}).eq('id', notification_id).eq('user_id', user_id).execute()

        if not result.data:
            return jsonify({'error': 'Notification not found'}), 404

        return jsonify({'notification': result.data[0]}), 200

    except Exception as e:
        print(f"Error marking notification as read: {e}")
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/read-all', methods=['POST'])
@_supabase_auth_required
def mark_all_as_read():
    """Mark all notifications as read for the current user."""
    try:
        user_id = _get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        admin = get_supabase_admin()
        admin.table('notifications').update({'is_read': True}).eq('user_id', user_id).eq('is_read', False).execute()

        return jsonify({'message': 'All notifications marked as read'}), 200

    except Exception as e:
        print(f"Error marking all as read: {e}")
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/<notification_id>', methods=['DELETE'])
@_supabase_auth_required
def delete_notification(notification_id):
    """Delete a single notification."""
    try:
        user_id = _get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        admin = get_supabase_admin()
        result = admin.table('notifications').delete().eq('id', notification_id).eq('user_id', user_id).execute()

        if not result.data:
            return jsonify({'error': 'Notification not found'}), 404

        return jsonify({'message': 'Notification deleted'}), 200

    except Exception as e:
        print(f"Error deleting notification: {e}")
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/clear', methods=['POST'])
@_supabase_auth_required
def clear_all_notifications():
    """Delete all notifications for the current user."""
    try:
        user_id = _get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        admin = get_supabase_admin()
        admin.table('notifications').delete().eq('user_id', user_id).execute()

        return jsonify({'message': 'All notifications cleared'}), 200

    except Exception as e:
        print(f"Error clearing notifications: {e}")
        return jsonify({'error': str(e)}), 500
