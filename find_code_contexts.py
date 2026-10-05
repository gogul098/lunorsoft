import re

js_path = "lunor_online/lunor.online/assets/index-CFSCJ6mI.js"
with open(js_path, "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

def find_context(pattern, max_matches=5):
    matches = [m.start() for m in re.finditer(pattern, js)]
    print(f"\n=== Context for '{pattern}' (Found {len(matches)}) ===")
    for idx in matches[:max_matches]:
        snippet = js[max(0, idx - 100):min(len(js), idx + 150)]
        print("---")
        print(snippet.encode('ascii', errors='replace').decode('ascii'))

find_context(r'\.from\(["\']resources["\']\)')
find_context(r'level-coach')
find_context(r'run-code')
find_context(r'create-razorpay-order')
find_context(r'github-oauth')
