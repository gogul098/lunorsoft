import re
import requests

js_path = "lunor_online/lunor.online/assets/index-CFSCJ6mI.js"
html_path = "lunor_online/lunor.online/index.html"

with open(js_path, "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

with open(html_path, "r", encoding="utf-8", errors="ignore") as f:
    html = f.read()

tok = re.findall(r'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+', js)[0]
supabase_url = "https://lgtpgglphbcncrtaajsg.supabase.co"
headers = {"apikey": tok, "Authorization": f"Bearer {tok}"}

print("=== 1. STORAGE BUCKETS IN CODE ===")
buckets = set(re.findall(r'storage\.from\([\"\']([^\"\']+)[\"\']\)', js))
print("Buckets found in code:", buckets)
for b in buckets:
    res = requests.get(f"{supabase_url}/storage/v1/bucket/{b}", headers=headers)
    print(f"  Bucket '{b}': {res.status_code} -> {res.text}")

print("\n=== 2. SUPABASE TABLES IN CODE ===")
tables = set(re.findall(r'\.from\([\"\']([a-zA-Z0-9_]+)[\"\']\)', js))
print(f"Total tables referenced: {len(tables)}")
missing_tables = []
forbidden_tables = []
accessible_tables = []

for t in sorted(tables):
    res = requests.get(f"{supabase_url}/rest/v1/{t}?select=*&limit=1", headers=headers)
    if res.status_code == 404:
        missing_tables.append((t, res.json() if res.headers.get("content-type", "").startswith("application/json") else res.text))
    elif res.status_code == 401 or res.status_code == 403:
        forbidden_tables.append(t)
    elif res.status_code == 200:
        accessible_tables.append(t)
    else:
        print(f"Table '{t}': {res.status_code}")

print(f"\nMissing Tables (404 Schema Cache Error): {len(missing_tables)}")
for t, err in missing_tables:
    print(f"  - {t}: {err}")

print(f"\nProtected / RLS Forbidden for Anon (401/403): {len(forbidden_tables)}")
print(f"  {', '.join(forbidden_tables[:15])}...")

print(f"\nPublicly Readable Tables (200): {len(accessible_tables)}")
print(f"  {', '.join(accessible_tables)}")

print("\n=== 3. HARDCODED EXTERNAL LINKS & IMAGE URLS ===")
# Check for broken images or demo images
img_urls = set(re.findall(r'https?://[^\s"\'`]+\.(?:png|jpg|jpeg|webp|svg)', js))
print(f"Total external image URLs found: {len(img_urls)}")
for img in sorted(img_urls):
    if "youtube" in img or "unsplash" in img or "r2.dev" in img:
        print(f"  External media: {img}")

print("\n=== 4. RAZORPAY & PAYMENT INTEGRATION ===")
rzp_mentions = re.findall(r'rzp_[a-zA-Z0-9_]+', js)
print("Razorpay key IDs found in JS:", set(rzp_mentions))
key_contexts = [m.start() for m in re.finditer(r'key_id', js)]
print(f"key_id occurrences: {len(key_contexts)}")
for kc in key_contexts[:3]:
    print("  Snippet:", js[max(0, kc-60):min(len(js), kc+60)].encode('ascii', errors='replace').decode('ascii'))
