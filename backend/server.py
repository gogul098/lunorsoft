"""
Lunor AI-Powered App Development Server v4.0
Autonomous Agent Backend (Antigravity / Claude Code / Codex Paradigm):
1. Workspace Endpoints (/api/workspace/files, /api/workspace/file, /api/workspace/open-folder)
2. Agentic Stream & Run (/api/agent/stream, /api/agent/run, /api/export)
3. Groq LLM Key Management (/api/config/groq)
4. Polyfill handlers for Supabase endpoints
5. Static File Server for Lunor App Studio UI
"""

import os
import json
import io
import asyncio
from typing import Dict, Any
from dotenv import load_dotenv
from starlette.applications import Starlette
from starlette.responses import JSONResponse, Response, StreamingResponse, FileResponse
from starlette.routing import Route, Mount
from starlette.staticfiles import StaticFiles
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
import sys

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

FRONTEND_DIR = os.environ.get("FRONTEND_DIR") or (
    os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))
    if os.path.exists(os.path.join(BASE_DIR, "..", "frontend"))
    else os.path.abspath("frontend")
)

from agent_orchestrator import AgentOrchestrator, WORKSPACE_DIR, list_workspace_files, save_file_to_disk
from lunor_mcp_server import LunorMobileMCPServer
from gdrive_service import gdrive_manager

orchestrator = AgentOrchestrator()
mcp_server = LunorMobileMCPServer()

# In-memory storage for mock file uploads
MOCK_STORAGE: Dict[str, Dict[str, bytes]] = {
    "avatars": {},
    "resumes": {},
    "resources": {},
    "community-images": {},
    "generated-media": {}
}

# --- Core Studio & Agentic Endpoints ---

async def api_health(request):
    groq_key = os.environ.get("GROQ_API_KEY", "")
    return JSONResponse({
        "status": "healthy",
        "service": "Lunor AI Autonomous Coding Agent",
        "llm_engine": "Groq Llama-3.3-70B-Versatile",
        "mcp_server": "lunor-mobile-mcp v2.0.0",
        "workspace_dir": WORKSPACE_DIR,
        "groq_configured": bool(groq_key and len(groq_key) > 8),
        "protocol": "Model Context Protocol (JSON-RPC 2.0 / SSE)",
        "deadline": "October 6th, 2026"
    })

async def api_config_groq(request):
    """Checks or updates the active Groq API Key."""
    if request.method == "POST":
        try:
            body = await request.json()
            key = (body.get("groq_api_key") or body.get("api_key") or "").strip()
            if key:
                os.environ["GROQ_API_KEY"] = key
                try:
                    with open(".env", "w", encoding="utf-8") as f:
                        f.write(f"# Lunor.AI App Studio - Groq API Configuration\nGROQ_API_KEY={key}\n")
                except Exception:
                    pass
                return JSONResponse({
                    "status": "saved",
                    "groq_configured": True,
                    "message": "Groq API key activated and saved to .env"
                })
            else:
                os.environ.pop("GROQ_API_KEY", None)
                try:
                    with open(".env", "w", encoding="utf-8") as f:
                        f.write("# Lunor.AI App Studio - Groq API Configuration\nGROQ_API_KEY=\n")
                except Exception:
                    pass
                return JSONResponse({
                    "status": "cleared",
                    "groq_configured": False,
                    "message": "Groq API key cleared"
                })
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=400)
    else:
        key = os.environ.get("GROQ_API_KEY", "")
        masked = f"{key[:6]}...{key[-4:]}" if len(key) > 10 else ("Configured" if key else "Not configured")
        return JSONResponse({
            "groq_configured": bool(key and len(key) > 8),
            "key_preview": masked
        })

# --- Workspace & Real File System Endpoints ---

async def api_workspace_files(request):
    """Returns the list of all files physically present in the generated_app workspace."""
    files = list_workspace_files()
    gdrive_stat = gdrive_manager.get_status()
    return JSONResponse({
        "workspace_dir": WORKSPACE_DIR,
        "total_files": len(files),
        "files": files,
        "gdrive": gdrive_stat
    })

async def api_workspace_get_file(request):
    """Reads a file directly from the generated_app workspace on disk."""
    path = request.query_params.get("path", "")
    if not path:
        return JSONResponse({"error": "Path required"}, status_code=400)
    rel_path = path.replace("\\", "/").lstrip("/")
    abs_path = os.path.join(WORKSPACE_DIR, rel_path)
    if not os.path.exists(abs_path):
        return JSONResponse({"error": f"File '{rel_path}' not found on disk"}, status_code=404)
    with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    return JSONResponse({
        "path": rel_path,
        "abs_path": abs_path,
        "content": content,
        "size": os.path.getsize(abs_path),
        "lines": len(content.splitlines())
    })

async def api_workspace_save_file(request):
    """Saves edits directly to a file on disk and syncs to Google Drive if connected."""
    try:
        body = await request.json()
        path = body.get("path", "")
        content = body.get("content", "")
        app_name = body.get("app_name", "LunorApp")
        if not path:
            return JSONResponse({"error": "Path required"}, status_code=400)
        meta = save_file_to_disk(path, content)

        gdrive_synced = False
        gdrive_stat = gdrive_manager.get_status()
        if gdrive_stat.get("is_connected"):
            try:
                gd_res = gdrive_manager.upload_file(path, content, app_name=app_name)
                gdrive_synced = gd_res.get("success", False)
            except Exception as e:
                print(f"[GDrive] Save-sync error: {e}")

        return JSONResponse({
            "status": "saved",
            "path": meta["path"],
            "abs_path": meta["abs_path"],
            "size": meta["size"],
            "lines": meta["lines"],
            "gdrive_synced": gdrive_synced
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

async def api_workspace_open_folder(request):
    """Opens the generated_app folder on the user's computer via Windows Explorer."""
    try:
        os.makedirs(WORKSPACE_DIR, exist_ok=True)
        if hasattr(os, "startfile"):
            os.startfile(WORKSPACE_DIR)
        else:
            import subprocess
            subprocess.Popen(["explorer", WORKSPACE_DIR])
        return JSONResponse({
            "status": "opened",
            "workspace_dir": WORKSPACE_DIR
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

async def api_workspace_manifest(request):
    """Returns the app manifest containing spec, nav graph, and simulator schema if saved on disk."""
    manifest_path = os.path.join(WORKSPACE_DIR, "lunor.manifest.json")
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return JSONResponse(data)
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=500)
    return JSONResponse({"status": "no_manifest"}, status_code=404)

# --- Google Drive Cloud Storage Endpoints ---

async def api_gdrive_status(request):
    """Returns the current connection and sync status of Google Drive."""
    return JSONResponse(gdrive_manager.get_status())

async def api_gdrive_config(request):
    """Configures Google Drive token or activates 1-click cloud workspace."""
    try:
        body = await request.json()
        if body.get("use_simulated_cloud"):
            email = body.get("user_email") or "developer@lunor.online"
            result = gdrive_manager.enable_simulated_cloud(user_email=email)
            return JSONResponse(result)

        token = body.get("access_token", "")
        folder_name = body.get("folder_name", "LunorApps")
        email = body.get("user_email", "")
        result = gdrive_manager.configure_token(token, custom_folder_name=folder_name, user_email=email)
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=400)

async def api_gdrive_sync(request):
    """Syncs current workspace files to Google Drive."""
    try:
        body = await request.json() if request.method == "POST" else {}
    except Exception:
        body = {}

    app_name = body.get("app_name") or "LunorApp"
    files = list_workspace_files()
    loaded_files = []
    for f in files:
        rel_p = f["path"]
        abs_p = f["abs_path"]
        try:
            with open(abs_p, "r", encoding="utf-8", errors="ignore") as file_obj:
                code = file_obj.read()
            loaded_files.append({"path": rel_p, "code": code})
        except Exception:
            pass

    sync_result = gdrive_manager.sync_all_project_files(loaded_files, app_name=app_name)
    return JSONResponse(sync_result)

async def api_gdrive_disconnect(request):
    """Disconnects Google Drive."""
    return JSONResponse(gdrive_manager.disconnect())

# --- Agent Pipeline Endpoints ---

async def api_agent_run(request):
    """Executes the autonomous agent loop and returns the complete project payload."""
    try:
        body = await request.json()
        prompt = body.get("prompt", "Mobile app with offline storage and interactive components")
        api_key = body.get("groq_api_key") or body.get("api_key") or os.environ.get("GROQ_API_KEY")
    except Exception:
        prompt = "Mobile app with offline storage and interactive components"
        api_key = os.environ.get("GROQ_API_KEY")

    payload = await orchestrator.execute_full_run(prompt, api_key=api_key)
    return JSONResponse(payload)

async def api_agent_stream(request):
    """Server-Sent Events (SSE) streaming real-time thoughts, tool calls, and disk write events."""
    prompt = request.query_params.get("prompt", "Mobile app with offline storage and interactive components")
    api_key = request.query_params.get("groq_api_key") or request.query_params.get("api_key") or os.environ.get("GROQ_API_KEY")

    async def event_generator():
        async for event in orchestrator.execute_cognitive_stream(prompt, api_key=api_key):
            event_data = json.dumps(event)
            yield f"data: {event_data}\n\n"
            await asyncio.sleep(0.02)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

async def api_export_zip(request):
    """Packages and downloads a runnable Expo ZIP project from disk files."""
    try:
        body = await request.json()
        files = body.get("files", [])
        app_name = body.get("app_name", "LunorMobileApp")
    except Exception:
        files = []
        app_name = "LunorMobileApp"

    # If no files passed in body, grab from workspace disk
    if not files:
        disk_files = list_workspace_files()
        for df in disk_files:
            try:
                with open(df["abs_path"], "r", encoding="utf-8", errors="ignore") as f:
                    files.append({"path": df["path"], "name": df["name"], "code": f.read()})
            except Exception:
                pass

    if not files:
        scaffold = mcp_server.scaffold_expo_components({}, "custom")
        files = scaffold["files"]

    zip_bytes = mcp_server.export_expo_zip(files, app_name)
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={app_name}-expo.zip"}
    )

# --- Polyfill Handlers for Unclosed / Broken Endpoints ---

async def mock_storage_upload(request):
    bucket = request.path_params.get("bucket", "resources")
    wildcard = request.path_params.get("path", "file.pdf")
    body = await request.body()
    if bucket not in MOCK_STORAGE:
        MOCK_STORAGE[bucket] = {}
    MOCK_STORAGE[bucket][wildcard] = body
    return JSONResponse({
        "Key": f"{bucket}/{wildcard}",
        "message": "Successfully uploaded to Lunor local mock storage",
        "publicUrl": f"/storage/v1/object/public/{bucket}/{wildcard}"
    }, status_code=200)

async def mock_storage_get_bucket(request):
    bucket = request.path_params.get("bucket", "resources")
    return JSONResponse({
        "id": bucket,
        "name": bucket,
        "owner": "lunor-local",
        "created_at": "2026-10-05T00:00:00Z",
        "updated_at": "2026-10-05T00:00:00Z",
        "public": True
    })

async def mock_resources_table(request):
    return JSONResponse([
        {"id": 1, "title": "Expo Router Architecture", "type": "guide", "url": "https://docs.expo.dev/router/introduction/"},
        {"id": 2, "title": "React Native Mobile Performance", "type": "docs", "url": "https://reactnative.dev/docs/performance"},
        {"id": 3, "title": "Model Context Protocol Specification", "type": "standard", "url": "https://modelcontextprotocol.io/"}
    ])

async def mock_edge_functions(request):
    func_name = request.path_params.get("function_name", "sandbox")
    if request.method == "OPTIONS":
        return Response("", status_code=204)
    try:
        body = await request.json()
    except Exception:
        body = {}
    return JSONResponse({
        "status": "success",
        "function": func_name,
        "message": f"Edge function '{func_name}' handled successfully."
    })

# --- Web UI Routes ---

def find_frontend_file(filename: str):
    candidates = [
        os.path.join(FRONTEND_DIR, filename),
        os.path.join(BASE_DIR, "..", "frontend", filename),
        os.path.join(BASE_DIR, "..", filename),
        os.path.join(BASE_DIR, filename),
        os.path.abspath(filename)
    ]
    for c in candidates:
        if os.path.exists(c) and os.path.isfile(c):
            return c
    return None

async def serve_studio(request):
    for name in ["index.html", "studio.html"]:
        path = find_frontend_file(name)
        if path:
            return FileResponse(path)
    return JSONResponse({"error": "Studio frontend not found"}, status_code=404)

async def serve_studio_css(request):
    path = find_frontend_file("studio.css")
    if path:
        return FileResponse(path, media_type="text/css")
    return JSONResponse({"error": "studio.css not found"}, status_code=404)

async def serve_studio_js(request):
    path = find_frontend_file("studio.js")
    if path:
        return FileResponse(path, media_type="application/javascript")
    return JSONResponse({"error": "studio.js not found"}, status_code=404)

async def serve_direct_assets(request):
    asset_path = request.path_params.get("path", "")
    candidates = [
        os.path.join(FRONTEND_DIR, "assets", asset_path),
        os.path.join(BASE_DIR, "..", "frontend", "assets", asset_path),
        os.path.join(BASE_DIR, "..", "lunor_online", "lunor.online", asset_path),
        os.path.join(BASE_DIR, "..", asset_path),
        os.path.join(BASE_DIR, "assets", asset_path)
    ]
    for c in candidates:
        if os.path.exists(c) and os.path.isfile(c):
            return FileResponse(c)
    return JSONResponse({"error": f"Asset '{asset_path}' not found"}, status_code=404)

routes = [
    Route("/", endpoint=serve_studio),
    Route("/studio", endpoint=serve_studio),
    Route("/index.html", endpoint=serve_studio),
    Route("/studio.html", endpoint=serve_studio),
    Route("/studio.css", endpoint=serve_studio_css),
    Route("/studio.js", endpoint=serve_studio_js),
    Route("/assets/{path:path}", endpoint=serve_direct_assets),
    Route("/api/health", endpoint=api_health, methods=["GET"]),
    Route("/api/config/groq", endpoint=api_config_groq, methods=["GET", "POST"]),
    Route("/api/agent/run", endpoint=api_agent_run, methods=["POST"]),
    Route("/api/agent/stream", endpoint=api_agent_stream, methods=["GET"]),
    Route("/api/export", endpoint=api_export_zip, methods=["POST"]),

    # Real Workspace Disk APIs
    Route("/api/workspace/files", endpoint=api_workspace_files, methods=["GET"]),
    Route("/api/workspace/file", endpoint=api_workspace_get_file, methods=["GET"]),
    Route("/api/workspace/file", endpoint=api_workspace_save_file, methods=["POST"]),
    Route("/api/workspace/open-folder", endpoint=api_workspace_open_folder, methods=["POST"]),
    Route("/api/workspace/manifest", endpoint=api_workspace_manifest, methods=["GET"]),

    # Google Drive APIs
    Route("/api/gdrive/status", endpoint=api_gdrive_status, methods=["GET"]),
    Route("/api/gdrive/config", endpoint=api_gdrive_config, methods=["POST"]),
    Route("/api/gdrive/sync", endpoint=api_gdrive_sync, methods=["POST"]),
    Route("/api/gdrive/disconnect", endpoint=api_gdrive_disconnect, methods=["POST"]),

    # Polyfilled endpoints
    Route("/storage/v1/bucket/{bucket:str}", endpoint=mock_storage_get_bucket, methods=["GET"]),
    Route("/storage/v1/object/{bucket:str}/{path:path}", endpoint=mock_storage_upload, methods=["POST", "PUT"]),
    Route("/rest/v1/resources", endpoint=mock_resources_table, methods=["GET"]),
    Route("/rest/v1/admin_resources", endpoint=mock_resources_table, methods=["GET"]),
    Route("/functions/v1/{function_name:str}", endpoint=mock_edge_functions, methods=["POST", "OPTIONS"])
]

middleware = [
    Middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"]
    )
]

app = Starlette(routes=routes, middleware=middleware)

# Mount static files to FRONTEND_DIR or workspace root
static_dir = FRONTEND_DIR if (os.path.exists(FRONTEND_DIR) and os.path.isdir(FRONTEND_DIR)) else os.path.abspath(os.path.join(BASE_DIR, ".."))
app.mount("/static", StaticFiles(directory=static_dir), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print("=" * 65)
    print(">> Lunor Agentic AI Code Studio -- Server Starting")
    print(f"   Workspace:    {WORKSPACE_DIR}")
    print(f"   Frontend:     {FRONTEND_DIR}")
    print(f"   Studio URL:   http://{host}:{port}")
    print("   LLM Engine:   Groq Llama-3.3-70B-Versatile")
    print("=" * 65)
    uvicorn.run(app, host=host, port=port, log_level="info")
