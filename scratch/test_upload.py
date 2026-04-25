import requests

url = "http://localhost:5000/api/secrets"
data = {
    "key": "test_key_123",
    "encryptedContent": "test_encrypted_content",
    "iv": "auto",
    "viewLimit": "1",
    "expiryValue": "1",
    "expiryUnit": "Hours"
}

files = {
    'file': ('test.txt', 'this is a test file content')
}

try:
    response = requests.post(url, data=data, files=files)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
