import re
import json

js_path = "lunor_online/lunor.online/assets/index-CFSCJ6mI.js"
with open(js_path, "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

# 1. Supabase functions / Edge functions called
edge_funcs = re.findall(r'functions\.invoke\([\"\']([^\"\']+)[\"\']', js)
print("=== Supabase Edge Functions Called ===")
for ef in set(edge_funcs):
    print(" ", ef)

# 2. Supabase Tables queried (.from("table_name"))
tables = re.findall(r'\.from\([\"\']([a-zA-Z0-9_]+)[\"\']\)', js)
print("\n=== Supabase Tables Queried ===")
for t in sorted(set(tables)):
    print(" ", t)

# 3. Check for hardcoded secrets or API keys
keys = re.findall(r'rzp_[a-zA-Z0-9_]+', js)
print("\n=== Razorpay Keys ===")
for k in set(keys):
    print(" ", k)

# 4. Check for OpenAI / Gemini / AI API calls
ai_mentions = re.findall(r'(api\.openai\.com|generativelanguage\.googleapis\.com|api\.anthropic\.com|groq\.com)', js)
print("\n=== Direct AI endpoints in frontend ===")
for a in set(ai_mentions):
    print(" ", a)

# 5. Check auth redirect URLs / localhost remnants
lh_mentions = re.findall(r'[\"\'\`][^\"\'\`]*localhost[^\"\'\`]*[\"\'\`]', js)
print("\n=== Localhost URLs in production bundle ===")
for lh in set(lh_mentions):
    print(" ", lh)

# 6. Check what flock.js is
flock_path = "lunor_online/lunor.online/~flock.js"
try:
    with open(flock_path, "r", encoding="utf-8", errors="ignore") as f:
        flock_text = f.read()
    print("\n=== ~flock.js size & sample ===")
    print("Size:", len(flock_text))
    print("First 200 chars:", flock_text[:200])
except Exception as e:
    print("Could not read flock.js:", e)
