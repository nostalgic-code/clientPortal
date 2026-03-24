"""Test /auth/me for client user."""
from supabase_client import get_supabase
import requests
import json

sb = get_supabase()
auth = sb.auth.sign_in_with_password({'email': 'jane@testclient.com', 'password': 'ClientPass123!'})
token = auth.session.access_token
print('Token obtained')

resp = requests.get('http://localhost:5000/api/auth/me', headers={'Authorization': 'Bearer ' + token})
print('Status:', resp.status_code)
data = resp.json()
print('user.role:', data.get('user', {}).get('role'))
print('has client:', 'client' in data)
if 'client' in data:
    print('client.name:', data['client'].get('name'))
    print('client.email:', data['client'].get('email'))
