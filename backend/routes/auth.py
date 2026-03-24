from flask import Blueprint, request, jsonify
from functools import wraps
from supabase_client import get_supabase, get_supabase_admin
from jose import jwt, JWTError
import os
import httpx
from types import SimpleNamespace

auth_bp = Blueprint('auth', __name__)

SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', '')

def get_user_from_token():
    """Extract user from Supabase JWT token via direct API call."""
    auth_header = request.headers.get('Authorization', '')
    print(f"[AUTH] Received Authorization header: {auth_header[:80] if auth_header else 'None'}...")
    
    if not auth_header.startswith('Bearer '):
        print("[AUTH] No Bearer token in Authorization header")
        return None
    
    token = auth_header.split(' ')[1]
    print(f"[AUTH] Token extracted (first 50 chars): {token[:50]}...")
    print(f"[AUTH] Making validation request to: {SUPABASE_URL}/auth/v1/user")
    print(f"[AUTH] Using anon key (first 50 chars): {SUPABASE_ANON_KEY[:50]}...")
    
    try:
        # Call Supabase Auth API directly to validate token
        # This works with any key type (HS256, ECC P-256, etc.)
        response = httpx.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_ANON_KEY,
            },
            timeout=10.0,
        )
        
        print(f"[AUTH] Validation response status: {response.status_code}")
        
        if response.status_code == 200:
            user_data = response.json()
            # Return a user-like object with .id and other attributes
            user = SimpleNamespace(**user_data)
            print(f"[AUTH] ✓ Token valid for user: {user.id}")
            return user
        else:
            print(f"[AUTH] ✗ Token validation failed: {response.status_code}")
            print(f"[AUTH] Response body: {response.text[:500]}")
            return None
    except Exception as e:
        print(f"[AUTH] ✗ Token validation error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return None

def supabase_auth_required(f):
    """Decorator to require Supabase authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_user_from_token()
        if not user:
            return jsonify({'error': 'Authorization token required'}), 401
        request.supabase_user = user
        return f(*args, **kwargs)
    return decorated_function

def get_current_user_id():
    """Get the current user's ID from the request."""
    if hasattr(request, 'supabase_user') and request.supabase_user:
        return request.supabase_user.id
    return None

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new admin user with their organization."""
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['email', 'password', 'name', 'organization_name']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    supabase = get_supabase()
    admin = get_supabase_admin()
    
    try:
        # Register with Supabase Auth
        auth_response = supabase.auth.sign_up({
            'email': data['email'],
            'password': data['password'],
            'options': {
                'data': {
                    'name': data['name'],
                    'role': 'admin'
                },
                'email_redirect_to': 'http://localhost:3000/auth/callback'
            }
        })
        
        if not auth_response.user:
            return jsonify({'error': 'Registration failed'}), 400
        
        user_id = auth_response.user.id
        
        # Use admin client (service role) to bypass RLS for org creation
        org_result = admin.table('organizations').insert({
            'name': data['organization_name'],
            'owner_id': user_id
        }).execute()
        
        if not org_result.data:
            return jsonify({'error': 'Failed to create organization'}), 500
        
        organization = org_result.data[0]
        
        # Add user to organization (admin client bypasses RLS)
        admin.table('organization_users').insert({
            'organization_id': organization['id'],
            'user_id': user_id,
            'role': 'admin'
        }).execute()
        
        # Update profile with company name from organization
        admin.table('profiles').update({
            'company_name': data['organization_name']
        }).eq('id', user_id).execute()
        
        # Get profile
        profile_result = admin.table('profiles').select('*').eq('id', user_id).single().execute()
        
        return jsonify({
            'message': 'User registered successfully',
            'user': profile_result.data if profile_result.data else {'id': user_id, 'email': data['email'], 'name': data['name']},
            'organization': organization,
            'access_token': auth_response.session.access_token if auth_response.session else None,
            'refresh_token': auth_response.session.refresh_token if auth_response.session else None
        }), 201
        
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': str(e)}), 400


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login and receive Supabase session tokens."""
    data = request.get_json()
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    supabase = get_supabase()
    
    try:
        # Sign in with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            'email': data['email'],
            'password': data['password']
        })
        
        if not auth_response.user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        user_id = auth_response.user.id
        
        # Get user profile (use admin for DB operations)
        admin = get_supabase_admin()
        profile_result = admin.table('profiles').select('*').eq('id', user_id).single().execute()
        profile = profile_result.data if profile_result.data else None
        
        # Get user's organization
        org_membership_result = admin.table('organization_users').select('*, organizations(*)').eq('user_id', user_id).execute()
        org_membership = org_membership_result.data[0] if org_membership_result.data else None
        organization = org_membership['organizations'] if org_membership else None
        
        # For clients, get their client profile
        client = None
        if profile and profile.get('role') == 'client':
            client_result = admin.table('clients').select('*').eq('user_id', user_id).single().execute()
            client = client_result.data if client_result.data else None
        
        response_data = {
            'message': 'Login successful',
            'user': profile or {'id': user_id, 'email': data['email']},
            'organization': organization,
            'access_token': auth_response.session.access_token,
            'refresh_token': auth_response.session.refresh_token
        }
        
        if client:
            response_data['client'] = client
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Invalid email or password'}), 401


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """Refresh access token using Supabase."""
    data = request.get_json()
    refresh_token = data.get('refresh_token')
    
    if not refresh_token:
        return jsonify({'error': 'Refresh token required'}), 400
    
    supabase = get_supabase()
    
    try:
        auth_response = supabase.auth.refresh_session(refresh_token)
        
        if not auth_response.session:
            return jsonify({'error': 'Invalid refresh token'}), 401
        
        return jsonify({
            'access_token': auth_response.session.access_token,
            'refresh_token': auth_response.session.refresh_token
        }), 200
        
    except Exception as e:
        print(f"Refresh error: {e}")
        return jsonify({'error': 'Invalid refresh token'}), 401


@auth_bp.route('/me', methods=['GET'])
@supabase_auth_required
def get_current_user():
    """Get current user details."""
    user = request.supabase_user
    user_id = user.id
    
    admin = get_supabase_admin()
    
    try:
        # Get profile
        profile_result = admin.table('profiles').select('*').eq('id', user_id).single().execute()
        profile = profile_result.data if profile_result.data else None
        
        if not profile:
            return jsonify({'error': 'User profile not found'}), 404
        
        # Get user's organization
        org_membership_result = admin.table('organization_users').select('*, organizations(*)').eq('user_id', user_id).execute()
        org_membership = org_membership_result.data[0] if org_membership_result.data else None
        organization = org_membership['organizations'] if org_membership else None
        
        # For clients, get their client profile
        client = None
        if profile.get('role') == 'client':
            client_result = admin.table('clients').select('*').eq('user_id', user_id).single().execute()
            client = client_result.data if client_result.data else None
        
        response_data = {
            'user': profile,
            'organization': organization,
            'org_role': org_membership['role'] if org_membership else None
        }
        
        if client:
            response_data['client'] = client
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Get user error: {e}")
        return jsonify({'error': 'Failed to get user data'}), 500


@auth_bp.route('/client-invite', methods=['POST'])
@supabase_auth_required
def invite_client():
    """Create a client user account and link to existing client."""
    user = request.supabase_user
    user_id = user.id
    
    admin = get_supabase_admin()
    
    # Check if user is admin
    profile_result = admin.table('profiles').select('role').eq('id', user_id).single().execute()
    if not profile_result.data or profile_result.data.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.get_json()
    client_id = data.get('client_id')
    password = data.get('password')
    
    if not client_id or not password:
        return jsonify({'error': 'client_id and password are required'}), 400
    
    try:
        # Get client
        client_result = admin.table('clients').select('*').eq('id', client_id).single().execute()
        if not client_result.data:
            return jsonify({'error': 'Client not found'}), 404
        
        client = client_result.data
        
        if client.get('user_id'):
            return jsonify({'error': 'Client already has a user account'}), 409
        
        # Check if email is already used
        existing_profile = admin.table('profiles').select('id').eq('email', client['email']).execute()
        if existing_profile.data:
            return jsonify({'error': 'Email already registered'}), 409
        
        # Create client user with Supabase Auth (must use admin/service-role client)
        auth_response = admin.auth.admin.create_user({
            'email': client['email'],
            'password': password,
            'email_confirm': True,
            'user_metadata': {
                'name': client['name'],
                'role': 'client'
            }
        })
        
        if not auth_response.user:
            return jsonify({'error': 'Failed to create user'}), 500
        
        client_user_id = auth_response.user.id
        
        # Link user to client
        admin.table('clients').update({'user_id': client_user_id}).eq('id', client_id).execute()
        
        # Add to organization (use 'member' role as org_users role, client role is in profiles)
        admin.table('organization_users').insert({
            'organization_id': client['organization_id'],
            'user_id': client_user_id,
            'role': 'member'
        }).execute()
        
        # Get updated client
        updated_client = admin.table('clients').select('*').eq('id', client_id).single().execute()
        profile = admin.table('profiles').select('*').eq('id', client_user_id).single().execute()
        
        return jsonify({
            'message': 'Client user created successfully',
            'user': profile.data if profile.data else {'id': client_user_id},
            'client': updated_client.data if updated_client.data else client
        }), 201
        
    except Exception as e:
        print(f"Client invite error: {e}")
        return jsonify({'error': str(e)}), 400


@auth_bp.route('/logout', methods=['POST'])
@supabase_auth_required
def logout():
    """Sign out the current user."""
    supabase = get_supabase()
    
    try:
        supabase.auth.sign_out()
        return jsonify({'message': 'Logged out successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400
