import re
import requests

js_path = "lunor_online/lunor.online/assets/index-CFSCJ6mI.js"
with open(js_path, "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

# Extract supabase anon key
tokens = re.findall(r'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+', js)
supabase_url = "https://lgtpgglphbcncrtaajsg.supabase.co"

print(f"Discovered {len(tokens)} JWT tokens in JS bundle.")
if tokens:
    anon_key = tokens[0]
    print(f"Testing with Anon Key: {anon_key[:25]}...")

    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Content-Type": "application/json"
    }

    # 1. Test public tables
    test_tables = ["resources", "admin_resources", "profiles", "domain_progress", "pop_ads"]
    for t in test_tables:
        url = f"{supabase_url}/rest/v1/{t}?select=*&limit=1"
        try:
            r = requests.get(url, headers=headers, timeout=5)
            print(f"Table '{t}': Status {r.status_code} -> {r.text[:120]}")
        except Exception as e:
            print(f"Table '{t}': Error {e}")

    # 2. Test Edge functions with Anon Key
    edge_functions = [
        "match-team",
        "github-push",
        "github-oauth",
        "verify-razorpay-payment",
        "project-runtime/manage",
        "run-code",
        "level-coach",
        "create-razorpay-order"
    ]
    print("\n--- Edge Functions with Anon Key ---")
    for ef in edge_functions:
        url = f"{supabase_url}/functions/v1/{ef}"
        try:
            r = requests.post(url, headers=headers, json={}, timeout=5)
            print(f"Function '{ef}': Status {r.status_code} -> {r.text[:120]}")
        except Exception as e:
            print(f"Function '{ef}': Error {e}")

    # 3. Test flock analytics endpoint on lunor.online
    print("\n--- Analytics Proxy Endpoint ---")
    try:
        r = requests.post("https://lunor.online/~api/analytics", headers=headers, json={"event": "test"}, timeout=5)
        print(f"lunor.online/~api/analytics: Status {r.status_code} -> {r.text[:120]}")
    except Exception as e:
        print(f"lunor.online/~api/analytics error: {e}")
