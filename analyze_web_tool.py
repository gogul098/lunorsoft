import re

js_path = "lunor_online/lunor.online/assets/index-CFSCJ6mI.js"
with open(js_path, "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

# Let's search for web development domain concepts, visual builder, studio, etc.
keywords = [
    "Web Development",
    "visual-builder",
    "VisualBuilder",
    "studio",
    "Studio",
    "domain_id",
    "level-coach",
    "sandpack",
    "run-code"
]

for kw in keywords:
    matches = [m.start() for m in re.finditer(re.escape(kw), js, re.IGNORECASE)]
    print(f"Keyword '{kw}': {len(matches)} matches")

# Let's find snippets around VisualBuilder and Studio
def show_snippets(kw, count=2):
    print(f"\n=== Snippets for '{kw}' ===")
    matches = [m.start() for m in re.finditer(re.escape(kw), js)]
    for i in matches[:count]:
        snippet = js[max(0, i-150):min(len(js), i+200)]
        print("---")
        print(snippet.encode('ascii', errors='replace').decode('ascii'))

show_snippets("VisualBuilder")
show_snippets("visual-builder")
show_snippets("sandpack")
