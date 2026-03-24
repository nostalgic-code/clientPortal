import requests
import json

# Test organization endpoint
r = requests.get('http://localhost:5000/api/organization', headers={'Authorization': 'Bearer fake'})
print(f"GET /api/organization status: {r.status_code}")
print(f"Response: {r.text[:200]}")
