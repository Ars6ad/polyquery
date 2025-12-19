import requests
import json
import time

BASE_URL = "http://localhost:3000/api"

def test_request(models):
    print(f"Testing models: {models}")
    try:
        payload = {
            "session_id": "debug_session",
            "prompt": "Hello",
            "models": models,
            "temperature": 0.7
        }
        r = requests.post(f"{BASE_URL}/compare", json=payload)
        print(f"Status Code: {r.status_code}")
        if r.status_code != 200:
            print(f"Error Response: {r.text}")
        else:
            print("Success:", r.json())
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    # Test 1: Known working model (hopefully)
    # test_request(["gpt-4o"]) 
    
    # Test 2: The new models
    test_request(["llama-3"])
    test_request(["mixtral-8x7b"])
