import re
import os
import requests
from urllib.parse import urljoin

base_url = "https://lunor.online"
js_file = "lunor_online/lunor.online/assets/index-CFSCJ6mI.js"
css_file = "lunor_online/lunor.online/assets/index-ClOzcHcv.css"
output_dir = "lunor_online/lunor.online"

with open(js_file, "r", encoding="utf-8", errors="ignore") as f:
    js_text = f.read()

with open(css_file, "r", encoding="utf-8", errors="ignore") as f:
    css_text = f.read()

# 1. Find routes
routes = set(re.findall(r'path:\s*[\"\'](/[^\"\']*)[\"\']', js_text))
routes.update(re.findall(r'to=[\"\'](/[^\"\']*)[\"\']', js_text))
routes.update(re.findall(r'href=[\"\'](/[^\"\']*)[\"\']', js_text))

print("=== Discovered Routes ===")
for r in sorted(routes):
    print(f"  {r}")

# 2. Find asset files (.png, .jpg, .svg, .webp, .ico, .json, fonts)
asset_pattern = r'[\"\'`]((/[a-zA-Z0-9_\-\.\/]+\.(?:png|jpg|jpeg|svg|webp|ico|json|woff2?|ttf|js|css)))[\"\'`]'
found_assets = set(m[0] for m in re.findall(asset_pattern, js_text))
css_assets = set(re.findall(r'url\([\'"]?([^\'")]+)[\'"]?\)', css_text))

all_assets = found_assets.union(css_assets)
print(f"\n=== Found {len(all_assets)} asset references ===")

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

downloaded = 0
for asset in sorted(all_assets):
    if asset.startswith("data:"):
        continue
    full_url = urljoin(base_url, asset)
    if not full_url.startswith(base_url):
        continue
    
    clean_path = asset.lstrip("/").split("?")[0].split("#")[0]
    local_path = os.path.join(output_dir, clean_path.replace("/", os.sep))
    
    try:
        r = requests.get(full_url, headers=headers, timeout=10)
        if r.status_code == 200:
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with open(local_path, "wb") as out_f:
                out_f.write(r.content)
            downloaded += 1
            print(f"  [+] Saved {asset} ({len(r.content)} bytes)")
        else:
            # print(f"  [-] {r.status_code}: {asset}")
            pass
    except Exception as e:
        # print(f"  [!] Failed {asset}: {e}")
        pass

print(f"\nSuccessfully downloaded {downloaded} additional assets!")
