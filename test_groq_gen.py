import os
import sys
import json
import time
import re
from dotenv import load_dotenv
load_dotenv()
from groq import Groq

def parse_llm_json(raw: str):
    if not raw:
        return None
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except Exception:
        pass
    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(cleaned[first_brace:last_brace + 1])
        except Exception:
            pass
    return None

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

sys_prompt = """You are Lunor Agentic AI.
Generate a complete, non-mock, functional React Native Expo mobile app.
Return ONLY valid JSON matching this structure:
{
  "spec": {"app_name": "...", "title": "...", "domain": "food", "prompt_summary": "...", "target_personas": ["..."], "native_hardware_apis": ["..."], "mobile_constraints": ["..."]},
  "nav_graph": {"navigation_type": "Expo Router", "tabs": [{"name": "Home", "route": "app/(tabs)/index.tsx", "icon": "home"}, {"name": "Orders", "route": "app/(tabs)/orders.tsx", "icon": "shopping-bag"}], "modals": []},
  "files": [
    {"path": "app/_layout.tsx", "name": "Root Layout", "code": "export default function Root() { return null; }"},
    {"path": "app/(tabs)/_layout.tsx", "name": "Tabs Layout", "code": "export default function Tabs() { return null; }"},
    {"path": "app/(tabs)/index.tsx", "name": "Home Screen", "code": "export default function Home() { return null; }"},
    {"path": "context/AppContext.tsx", "name": "App Context", "code": "export function useApp() { return {}; }"},
    {"path": "package.json", "name": "package.json", "code": "{\\"name\\": \\"app\\"}"}
  ],
  "simulator_schema": {"appName": "AppName", "activeScreen": "Home", "screens": {"Home": {"title": "Home", "metric": {"title": "Total", "value": "10", "sub": "items"}, "inputPlaceholder": "Add item...", "sectionTitle": "Items", "items": [{"id": "1", "title": "Item 1", "subtitle": "Details", "emoji": "⚡", "done": false}]}}},
  "lesson": {"title": "App Architecture", "architecture_overview": "Overview", "concepts": [{"title": "Hooks", "why_it_matters": "State management", "code_snippet": "useState()"}]},
  "challenges": {"quiz": [{"question": "Q1", "options": ["A","B","C","D"], "answer_index": 0, "explanation": "Expl"}], "mini_challenges": []}
}"""

print("Testing Groq call with openai/gpt-oss-120b...")
t0 = time.time()
c = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": "Build a campus food delivery app with restaurant listings, cart total, courier tracking, and dining hall menu"}
    ],
    response_format={"type": "json_object"},
    temperature=0.3,
    max_tokens=6000
)
raw = c.choices[0].message.content
parsed = parse_llm_json(raw)
elapsed = time.time() - t0
print(f"Call finished in {elapsed:.2f}s! Parsed success:", bool(parsed))
if parsed:
    print("App Name:", parsed.get("spec", {}).get("app_name"))
    print("Files count:", len(parsed.get("files", [])))
    for f in parsed.get("files", []):
        print(" -", f["path"])
