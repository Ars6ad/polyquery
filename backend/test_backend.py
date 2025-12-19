import requests
import time
import json
import sys
import os

BASE_URL = "http://localhost:3000/api"
LOG_FILE = "test_log.txt"

def log(msg):
    with open(LOG_FILE, "a") as f:
        f.write(msg + "\n")

def test_compare():
    if os.path.exists(LOG_FILE):
        os.remove(LOG_FILE)
        
    log(f"Testing connectivity to {BASE_URL}...")
    
    # 1. Test List
    try:
        log("GET /comparisons...")
        r = requests.get(f"{BASE_URL}/comparisons")
        log(f"Response Status: {r.status_code}")
        # log(f"Response: {r.text[:100]}...")
    except Exception as e:
        log(f"Failed to connect: {e}")
        return

    # 2. Test Compare
    log("POST /compare...")
    payload = {
        "session_id": "test_session_verify_file",
        "prompt": "Hello file logger",
        "models": ["gpt-4o"],
        "temperature": 0.7
    }
    
    try:
        r = requests.post(f"{BASE_URL}/compare", json=payload)
        log(f"Start Status: {r.status_code}")
        if r.status_code != 200:
            log(r.text)
            return

        data = r.json()
        comp_id = data["id"]
        log(f"Comparison ID: {comp_id}")
        
        # Poll
        for i in range(5):
            time.sleep(1)
            r = requests.get(f"{BASE_URL}/comparisons/{comp_id}/status")
            status = r.json()
            log(f"Poll {i+1}: {status['status']}")
            if status["status"] == "completed":
                break
                
        # Get result
        r = requests.get(f"{BASE_URL}/comparisons/{comp_id}")
        log("Final Result Valid.")
        
    except Exception as e:
        log(f"Error during comparison: {e}")

if __name__ == "__main__":
    test_compare()
