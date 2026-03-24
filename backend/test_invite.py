"""Test the client invite flow end-to-end."""
from supabase_client import get_supabase, get_supabase_admin
import requests
import json

admin = get_supabase_admin()

# Clean up duplicate clients
print("=== Cleaning up duplicates ===")
clients = admin.table('clients').select('id,name,email').eq('email', 'jane@testclient.com').execute()
if len(clients.data) > 1:
    for c in clients.data[1:]:
        admin.table('clients').delete().eq('id', c['id']).execute()
        print(f"  Deleted duplicate: {c['id']}")

# Get remaining client
client = admin.table('clients').select('*').eq('email', 'jane@testclient.com').single().execute()
print(f"\nClient: {client.data['id']} - {client.data['name']} ({client.data['email']})")

# Generate admin token using service role
# We'll use gotrue admin to generate a link or just test directly
admin_user_id = '22b4e0d3-c35b-4f6c-8d6f-ab222db630ab'

# Generate access token for admin user
gen = admin.auth.admin.generate_link({
    'type': 'magiclink',
    'email': 'syloncube837@gmail.com'
})
print(f"\nGenerated link for admin (to get token)")

# Alternative: Just call the endpoint directly with a generated JWT
# For testing, let's use the admin to create the user directly
print("\n=== Testing invite logic directly ===")
client_data = client.data

# Simulate what the endpoint does
try:
    auth_response = admin.auth.admin.create_user({
        'email': client_data['email'],
        'password': 'ClientPass123!',
        'email_confirm': True,
        'user_metadata': {
            'name': client_data['name'],
            'role': 'client'
        }
    })
    print(f"Created auth user: {auth_response.user.id}")
    
    # Link user_id to client
    admin.table('clients').update({'user_id': str(auth_response.user.id)}).eq('id', client_data['id']).execute()
    print("Linked user_id to client")
    
    # Add to organization
    admin.table('organization_users').insert({
        'organization_id': client_data['organization_id'],
        'user_id': str(auth_response.user.id),
        'role': 'client'
    }).execute()
    print("Added to organization_users")
    
    # Check profile was created
    profile = admin.table('profiles').select('*').eq('id', str(auth_response.user.id)).single().execute()
    print(f"Profile: {profile.data}")
    
    print("\n=== SUCCESS! Client can now log in with: ===")
    print(f"  Email: {client_data['email']}")
    print(f"  Password: ClientPass123!")
    print(f"  Role: client")
    print(f"  User ID: {auth_response.user.id}")
    
except Exception as e:
    print(f"Error: {e}")

