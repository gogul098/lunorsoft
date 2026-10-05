import os
import re
import sys
import time
import argparse
from urllib.parse import urljoin, urlparse, unquote
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def sanitize_filename(name: str) -> str:
    """Removes invalid filename characters for cross-platform compatibility."""
    return re.sub(r'[<>:"/\\|?*]', "_", name)


def url_to_local_path(base_dir: str, target_domain: str, url: str) -> str:
    """
    Translates a URL into a local directory and file path.
    Preserves site folder hierarchy.
    """
    parsed = urlparse(url)
    path = unquote(parsed.path).lstrip("/")

    # If root or directory, append index.html
    if not path or path.endswith("/"):
        path += "index.html"
    else:
        _, ext = os.path.splitext(path)
        if not ext:
            path += ".html"

    # Split into folder parts and sanitize each segment
    parts = [sanitize_filename(p) for p in path.split("/") if p]
    return os.path.join(base_dir, sanitize_filename(target_domain), *parts)


class WebsiteScraper:
    def __init__(
        self,
        start_url: str,
        output_dir: str = "./scraped_site",
        max_pages: int = 50,
        delay: float = 0.5,
        download_assets: bool = True,
        timeout: int = 15,
    ):
        self.start_url = start_url.strip()
        parsed_start = urlparse(self.start_url)
        if not parsed_start.scheme:
            self.start_url = "https://" + self.start_url
            parsed_start = urlparse(self.start_url)

        self.base_domain = parsed_start.netloc
        self.output_dir = output_dir
        self.max_pages = max_pages
        self.delay = delay
        self.download_assets = download_assets
        self.timeout = timeout

        self.session = requests.Session()
        self.session.headers.update(HEADERS)

        self.visited_pages = set()
        self.downloaded_assets = set()
        self.failed_urls = set()

    def normalize_url(self, url: str) -> str:
        """Strips fragment and ensures consistent trailing slash/path handling."""
        parsed = urlparse(url)
        path = parsed.path
        if not path:
            path = "/"
        elif len(path) > 1 and path.endswith("/"):
            path = path.rstrip("/")
        return parsed._replace(fragment="", path=path).geturl()

    def is_same_domain(self, url: str) -> bool:
        """Checks if a URL belongs to the target domain or subdomains."""
        parsed = urlparse(url)
        return parsed.netloc == self.base_domain

    def save_content(self, url: str, content: bytes, local_path: str):
        """Writes downloaded content to disk."""
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(content)

    def fetch(self, url: str):
        """Fetches a URL with error handling."""
        try:
            res = self.session.get(url, timeout=self.timeout)
            return res
        except Exception as e:
            self.failed_urls.add(url)
            print(f"  [!] Failed to fetch {url}: {e}")
            return None

    def download_asset(self, asset_url: str):
        """Downloads a static asset (CSS, JS, images, fonts)."""
        asset_url = asset_url.split("#")[0]
        if asset_url in self.downloaded_assets or not self.is_same_domain(asset_url):
            return

        self.downloaded_assets.add(asset_url)
        local_path = url_to_local_path(self.output_dir, self.base_domain, asset_url)

        res = self.fetch(asset_url)
        if res and res.status_code == 200:
            self.save_content(asset_url, res.content, local_path)
            print(f"    [Asset] Downloaded: {asset_url}")

    def scrape_page(self, page_url: str):
        """Scrapes an individual page, saves its HTML, assets, and queues new links."""
        normalized = self.normalize_url(page_url)
        if normalized in self.visited_pages:
            return

        if self.max_pages > 0 and len(self.visited_pages) >= self.max_pages:
            return

        self.visited_pages.add(normalized)
        print(f"\n[{len(self.visited_pages)}] Scraping: {page_url}")

        res = self.fetch(page_url)
        if not res or res.status_code != 200:
            return

        content_type = res.headers.get("Content-Type", "").lower()
        if "text/html" not in content_type:
            # Not an HTML page, save directly
            local_path = url_to_local_path(self.output_dir, self.base_domain, page_url)
            self.save_content(page_url, res.content, local_path)
            return

        local_path = url_to_local_path(self.output_dir, self.base_domain, page_url)
        self.save_content(page_url, res.content, local_path)
        print(f"  -> Saved HTML: {local_path}")

        soup = BeautifulSoup(res.text, "html.parser")

        # 1. Download page assets if enabled
        if self.download_assets:
            asset_tags = [
                ("link", "href"),
                ("script", "src"),
                ("img", "src"),
                ("source", "srcset"),
            ]
            for tag_name, attr in asset_tags:
                for elem in soup.find_all(tag_name, **{attr: True}):
                    raw_val = elem[attr]
                    # Handle srcset with multiple image candidates
                    if attr == "srcset":
                        urls = [s.strip().split(" ")[0] for s in raw_val.split(",") if s.strip()]
                    else:
                        urls = [raw_val]

                    for u in urls:
                        full_asset_url = urljoin(page_url, u)
                        self.download_asset(full_asset_url)

        # 2. Collect internal links to continue crawling
        links_to_visit = []
        for a in soup.find_all("a", href=True):
            next_url = urljoin(page_url, a["href"])
            normalized_next = self.normalize_url(next_url)
            if self.is_same_domain(next_url) and normalized_next not in self.visited_pages:
                links_to_visit.append(next_url)

        if self.delay > 0:
            time.sleep(self.delay)

        # Recurse through links
        for next_link in links_to_visit:
            if self.max_pages > 0 and len(self.visited_pages) >= self.max_pages:
                break
            self.scrape_page(next_link)

    def run(self):
        """Starts the crawling and scraping process."""
        print("=" * 60)
        print(f"Target URL:    {self.start_url}")
        print(f"Domain:        {self.base_domain}")
        print(f"Output Dir:    {os.path.abspath(self.output_dir)}")
        print(f"Max Pages:     {self.max_pages if self.max_pages > 0 else 'Unlimited'}")
        print(f"Fetch Assets:  {self.download_assets}")
        print("=" * 60)

        start_time = time.time()
        self.scrape_page(self.start_url)
        elapsed = time.time() - start_time

        print("\n" + "=" * 60)
        print("SCRAPING SUMMARY")
        print("=" * 60)
        print(f"Total HTML pages scraped: {len(self.visited_pages)}")
        print(f"Total assets downloaded:  {len(self.downloaded_assets)}")
        print(f"Failed requests:          {len(self.failed_urls)}")
        print(f"Time elapsed:             {elapsed:.2f} seconds")
        print(f"Output directory:         {os.path.abspath(self.output_dir)}")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Recursively scrapes all pages and client-side code from a website."
    )
    parser.add_argument(
        "url",
        nargs="?",
        help="Target website URL (e.g., https://example.com)",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="./scraped_site",
        help="Directory to store downloaded pages and assets (default: ./scraped_site)",
    )
    parser.add_argument(
        "-m",
        "--max-pages",
        type=int,
        default=30,
        help="Maximum number of pages to crawl (default: 30, set 0 for unlimited)",
    )
    parser.add_argument(
        "-d",
        "--delay",
        type=float,
        default=0.5,
        help="Delay in seconds between requests (default: 0.5s)",
    )
    parser.add_argument(
        "--no-assets",
        action="store_true",
        help="Skip downloading assets (images, CSS, JS)",
    )

    args = parser.parse_args()

    url = args.url
    if not url:
        try:
            url = input("Enter website URL to scrape: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting.")
            sys.exit(0)

    if not url:
        print("Error: No URL provided.")
        sys.exit(1)

    scraper = WebsiteScraper(
        start_url=url,
        output_dir=args.output,
        max_pages=args.max_pages,
        delay=args.delay,
        download_assets=not args.no_assets,
    )
    scraper.run()


if __name__ == "__main__":
    main()
