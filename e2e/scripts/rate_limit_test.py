import sys
import random
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "http://localhost:8000/api/v1"

def test_rate_limiting():
    user_id = random.randint(10000, 99999)
    # Use the special @throttle.com domain to trigger low rate limit behavior
    email = f"rate_limit_test_{user_id}@throttle.com"
    reg_url = f"{BASE_URL}/auth/register/"
    reg_data = {
        "email": email,
        "password": "Password123",
        "name": f"Rate Limit Test {user_id}"
    }

    print(f"Registering user: {email}...")
    reg_res = requests.post(reg_url, json=reg_data)
    if reg_res.status_code != 201:
        print(f"Failed to register user: {reg_res.status_code} {reg_res.text}")
        sys.exit(1)

    tokens = reg_res.json()
    access_token = tokens["token"]["access"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Fire 5 requests in parallel to blueprints route
    bp_url = f"{BASE_URL}/blueprints/"
    print("Sending parallel requests to blueprints route...")

    status_codes = []
    
    def send_request():
        try:
            r = requests.get(bp_url, headers=headers)
            return r.status_code
        except Exception as e:
            return str(e)

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(send_request) for _ in range(5)]
        for fut in as_completed(futures):
            status_codes.append(fut.result())

    print(f"Received status codes: {status_codes}")
    
    has_429 = 429 in status_codes
    if has_429:
        print("Success: 429 Too Many Requests response was received.")
        sys.exit(0)
    else:
        print("Failure: No 429 status code was received. Rate limiting might be disabled or bypass limits are too high.")
        sys.exit(1)

if __name__ == "__main__":
    test_rate_limiting()
