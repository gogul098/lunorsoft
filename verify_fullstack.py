import sys
import os
import requests
import json

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(name, url, method="GET", json_body=None, expected_status=200):
    try:
        if method == "GET":
            r = requests.get(url, timeout=5)
        else:
            r = requests.post(url, json=json_body, timeout=5)
        status_ok = (r.status_code == expected_status)
        symbol = "[PASS]" if status_ok else "[FAIL]"
        print(f"{symbol} {name} ({method} {url}) -> HTTP {r.status_code}")
        if not status_ok:
            print(f"    Error: Expected {expected_status}, got {r.status_code}")
            print(f"    Body: {r.text[:200]}")
            return False, r
        return True, r
    except Exception as e:
        print(f"[FAIL] {name} ({method} {url}) -> Failed: {e}")
        return False, None

def run_all_tests():
    print("=" * 65)
    print("LUNOR FULL-STACK WORKSPACE VERIFICATION")
    print("=" * 65)
    
    passed = 0
    total = 0
    
    tests = [
        ("Root Studio UI", f"{BASE_URL}/", "GET", None, 200),
        ("Studio Route", f"{BASE_URL}/studio", "GET", None, 200),
        ("Direct CSS Route", f"{BASE_URL}/studio.css", "GET", None, 200),
        ("Direct JS Route", f"{BASE_URL}/studio.js", "GET", None, 200),
        ("Static CSS Route", f"{BASE_URL}/static/studio.css", "GET", None, 200),
        ("Static JS Route", f"{BASE_URL}/static/studio.js", "GET", None, 200),
        ("Direct Assets Route", f"{BASE_URL}/assets/logo.jpeg", "GET", None, 200),
        ("API Health Check", f"{BASE_URL}/api/health", "GET", None, 200),
        ("API Groq Config Check", f"{BASE_URL}/api/config/groq", "GET", None, 200),
        ("API Workspace Files", f"{BASE_URL}/api/workspace/files", "GET", None, 200),
        ("API Google Drive Status", f"{BASE_URL}/api/gdrive/status", "GET", None, 200),
    ]

    for name, url, method, body, expected in tests:
        total += 1
        ok, res = test_endpoint(name, url, method, body, expected)
        if ok:
            passed += 1

    # Test Google Drive Cloud Configuration
    total += 1
    gd_payload = {"use_simulated_cloud": True, "user_email": "developer@lunor.online"}
    ok, res = test_endpoint("API Google Drive Config (Simulated Cloud)", f"{BASE_URL}/api/gdrive/config", "POST", gd_payload, 200)
    if ok:
        passed += 1
        print("    -> GDrive Config Result:", res.json())

    # Test Google Drive Cloud Sync
    total += 1
    sync_payload = {"app_name": "LunorApp"}
    ok, res = test_endpoint("API Google Drive Sync", f"{BASE_URL}/api/gdrive/sync", "POST", sync_payload, 200)
    if ok:
        passed += 1
        print(f"    -> GDrive Sync Result: {res.json().get('total_synced')} files synced")

    print("=" * 65)
    print(f"VERIFICATION SUMMARY: {passed}/{total} Passed")
    print("=" * 65)
    
    if passed == total:
        print(">> ALL TESTS PASSED! ZERO ERRORS DETECTED.")
        return 0
    else:
        print(">> SOME TESTS FAILED.")
        return 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
