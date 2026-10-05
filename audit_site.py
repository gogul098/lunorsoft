import re
import json

js_path = "lunor_online/lunor.online/assets/index-CFSCJ6mI.js"
html_path = "lunor_online/lunor.online/index.html"

with open(js_path, "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

with open(html_path, "r", encoding="utf-8", errors="ignore") as f:
    html = f.read()

print(f"JS Bundle Size: {len(js):,} characters")

# 1. Look for API endpoints / URLs
api_urls = set(re.findall(r'https?://[a-zA-Z0-9_\-\.\:\/]+', js))
filtered_apis = [u for u in api_urls if not any(x in u for x in ['w3.org', 'schema.org', 'github.com/facebook', 'reactjs.org'])]

print("\n--- Discovered External URLs / API endpoints (Sample) ---")
for u in sorted(filtered_apis)[:40]:
    print(" ", u)

# 2. Look for Backend configurations, Supabase, Firebase, OpenAI, Gemini, etc.
supabase_matches = re.findall(r'supabase[a-zA-Z0-9_\-\.]*', js, re.IGNORECASE)
print(f"\nSupabase mentions: {len(supabase_matches)}")

# Search for env vars or keys
key_matches = re.findall(r'([a-zA-Z0-9_]*(?:KEY|SECRET|TOKEN|API|URL|ID|CLIENT)[a-zA-Z0-9_]*\s*[:=]\s*[\"\'][a-zA-Z0-9_\-\.]{8,}[\"\'])', js)
print("\n--- Potential Key / Config strings (First 20) ---")
for k in key_matches[:20]:
    print(" ", k)

# 3. Look for Supabase URLs and keys
sb_url = re.findall(r'https:\/\/[a-z0-9\-]+\.supabase\.co', js)
print("\nSupabase URLs:", set(sb_url))

sb_anon = re.findall(r'eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+', js)
print("JWT / Anon tokens found:", len(sb_anon))
for t in set(sb_anon):
    print("  Token prefix:", t[:30] + "...")

# 4. Check HTML for issues (TODOs, template remnants, etc.)
print("\n--- HTML Checks ---")
for line in html.splitlines():
    if "TODO" in line or "lovable" in line.lower() or "preview" in line.lower():
        print(" ", line.strip())
