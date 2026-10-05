# Lunor AI Autonomous Agent Backend (v4.0)

Production-ready ASGI backend for Lunor.AI — an autonomous mobile app development engine modeled after Antigravity, Claude Code, and Codex.

---

## 🌟 Capabilities

- **Autonomous Agent Loop**: Multi-phase reasoning pipeline (Product Manager, Architect, Builder, Tutor, MCP Integrator).
- **Physical Workspace Persistence**: Direct file writes to disk (`../generated_app/`) with AST lint verification.
- **Google Drive Cloud Storage**: 1-click cloud sync, automatic token refresh, simulated cloud mode, and live project syncing to Google Drive.
- **Model Context Protocol (MCP)**: Native JSON-RPC 2.0 / SSE server exposing Expo component scaffolding, code linting, and project zip packaging.
- **Streaming Telemetry**: Real-time SSE streams delivering agent thoughts, tool execution results, and disk write events.
- **Production ASGI Server**: Built with Starlette and Uvicorn with auto-detection of static frontend assets.

---

## 🚀 Quick Start (Local)

### 1. Setup Virtual Environment & Install Dependencies
```bash
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Groq API key (free at https://console.groq.com/keys):
```ini
GROQ_API_KEY=gsk_your_groq_api_key_here
PORT=8000
HOST=0.0.0.0
```

### 3. Launch Server
```bash
python server.py
# Or via uvicorn directly:
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🌐 Cloud Deployment Options

### Option 1: Render.com (1-Click Blueprint)
1. Push this repository to GitHub or GitLab.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** -> **Blueprint**.
3. Select this repository; Render will automatically detect `render.yaml`.
4. Add your `GROQ_API_KEY` under Environment Variables.
5. Click **Apply**!

### Option 2: Railway
1. In [Railway.app](https://railway.app), select **New Project** -> **Deploy from GitHub repo**.
2. Set the Root Directory to `/backend` (or deploy from root using `Procfile`).
3. Set Environment Variable `GROQ_API_KEY`.
4. Railway will automatically build via `requirements.txt` and start with `Procfile`.

### Option 3: Docker / Container (Cloud Run / AWS ECS / DigitalOcean)
Build and run the Docker image:
```bash
docker build -t lunor-backend .
docker run -p 8000:8000 -e GROQ_API_KEY="gsk_..." lunor-backend
```

---

## 📡 API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server health, active LLM, MCP server version |
| `/api/config/groq` | GET, POST | Get or update active Groq API Key |
| `/api/agent/stream` | GET | Real-time SSE streaming of agent thoughts & tool calls |
| `/api/agent/run` | POST | Synchronous execution of full agent pipeline |
| `/api/workspace/files` | GET | List all physical files on disk & Google Drive status |
| `/api/workspace/file` | GET, POST | Read or save edits directly to workspace files |
| `/api/workspace/open-folder`| POST | Opens the generated app folder in OS file explorer |
| `/api/workspace/manifest` | GET | Fetch the current app's architectural specification |
| `/api/gdrive/status` | GET | Check Google Drive cloud sync status |
| `/api/gdrive/config` | POST | Configure access token or enable simulated cloud |
| `/api/gdrive/sync` | POST | Sync all workspace project files to Google Drive |
| `/api/gdrive/disconnect` | POST | Disconnect Google Drive cloud storage |
| `/api/export` | POST | Download runnable Expo project as a `.zip` archive |
