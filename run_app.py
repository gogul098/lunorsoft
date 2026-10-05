"""
Lunor AI — Autonomous Mobile App Development Platform
Unified Startup Script (Full-Stack Launcher)

Runs the production backend ASGI server with automatic frontend asset binding.
Usage:
    python run_app.py
"""

import os
import sys

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure paths are configured
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

os.environ["FRONTEND_DIR"] = FRONTEND_DIR

if __name__ == "__main__":
    import uvicorn
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BACKEND_DIR, ".env"))
    load_dotenv(os.path.join(ROOT_DIR, ".env"))

    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")

    print("\n" + "=" * 70)
    print("  >> Lunor AI - Autonomous Mobile App Development Studio")
    print("=" * 70)
    print(f"  * Studio UI:        http://{host}:{port}")
    print(f"  * API Health:       http://{host}:{port}/api/health")
    print(f"  * Workspace Disk:   {os.path.join(ROOT_DIR, 'generated_app')}")
    print(f"  * Cloud Storage:    Google Drive (Connected / Auto-Sync)")
    print(f"  * LLM Engine:       Groq LPU (openai/gpt-oss-120b)")
    print("=" * 70 + "\n")

    uvicorn.run("server:app", app_dir=BACKEND_DIR, host=host, port=port, log_level="info", reload=False)
