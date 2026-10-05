import requests

supabase_url = "https://lgtpgglphbcncrtaajsg.supabase.co"
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

print("=== Probing Supabase Edge Functions ===")
for ef in edge_functions:
    url = f"{supabase_url}/functions/v1/{ef}"
    try:
        # Send OPTIONS (preflight check)
        opt_res = requests.options(url, timeout=5)
        # Send POST without auth
        post_res = requests.post(url, json={}, timeout=5)
        print(f"Function: {ef}")
        print(f"  OPTIONS: {opt_res.status_code}")
        print(f"  POST:    {post_res.status_code} -> {post_res.text[:100]}")
    except Exception as e:
        print(f"Function: {ef} -> Error: {e}")

# Check Supabase REST API root
try:
    rest_res = requests.get(f"{supabase_url}/rest/v1/", timeout=5)
    print(f"\nREST API root status: {rest_res.status_code} -> {rest_res.text[:100]}")
except Exception as e:
    print("REST API root error:", e)
