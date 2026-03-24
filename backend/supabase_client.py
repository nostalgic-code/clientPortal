# Supabase client configuration
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
basedir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(basedir, '.env'))

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file")

# Create Supabase clients
# Anon client - for auth operations (sign up, sign in)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Service role client - bypasses RLS for backend database operations
# This is the standard pattern for a backend middleware with Supabase
if SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    print("[CONFIG] Service role key configured - using admin client for DB operations")
else:
    supabase_admin = supabase
    print("[CONFIG] WARNING: No SUPABASE_SERVICE_ROLE_KEY set. Using anon key (RLS applies).")

def get_supabase() -> Client:
    """Get the Supabase anon client instance (for auth operations)."""
    return supabase

def get_supabase_admin() -> Client:
    """Get the Supabase admin/service role client (bypasses RLS for DB operations)."""
    return supabase_admin

def get_authenticated_client(access_token: str) -> Client:
    """Get a Supabase client authenticated with user's access token."""
    return create_client(
        SUPABASE_URL, 
        SUPABASE_ANON_KEY,
        options={
            'headers': {
                'Authorization': f'Bearer {access_token}'
            }
        }
    )
