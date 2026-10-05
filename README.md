# Lunor.AI — Autonomous Mobile App Development Platform (v4.0)

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![ASGI Starlette](https://img.shields.io/badge/ASGI-Starlette-brightgreen.svg)](https://www.starlette.io/)
[![LLM Groq 120B](https://img.shields.io/badge/LLM-Groq%20LPU%20(120B)-orange.svg)](https://groq.com/)
[![MCP 2.0](https://img.shields.io/badge/Protocol-MCP%202.0-purple.svg)](https://modelcontextprotocol.io/)
[![Google Drive Cloud](https://img.shields.io/badge/Storage-Google%20Drive-4285F4.svg)](https://drive.google.com/)

An autonomous AI coding and mentor platform for cross-platform (iOS/Android) mobile apps, engineered after modern agent paradigms (**Google Antigravity**, **Anthropic Claude Code**, and **OpenAI Codex**).

---

## 📁 Repository Structure

The workspace has been completely decoupled into clean `frontend/` and `backend/` tiers:

```
lunorsoft/
├── frontend/                     # Decoupled Static Client (Vercel, Netlify, Cloudflare)
│   ├── index.html                # Main Studio UI entrypoint
│   ├── studio.html               # Studio alternate route
│   ├── studio.css                # Polished Dark Glassmorphism Design System
│   ├── studio.js                 # Virtual DOM Simulator, File Explorer & API Client
│   ├── assets/
│   │   └── logo.jpeg             # Lunor Brand Logo Mark
│   ├── vercel.json               # 1-Click Vercel Deployment Configuration
│   ├── netlify.toml              # 1-Click Netlify Deployment Configuration
│   └── README.md                 # Frontend Hosting Guide
│
├── backend/                      # Autonomous Agent ASGI Backend (Render, Railway, Docker)
│   ├── server.py                 # Starlette + Uvicorn Production Server
│   ├── agent_orchestrator.py     # 5-Persona Autonomous Reasoning Loop
│   ├── gdrive_service.py         # Google Drive Cloud Repository & Auto-Sync
│   ├── lunor_mcp_server.py       # Model Context Protocol (MCP) Server
│   ├── requirements.txt          # Production Python Dependencies
│   ├── Dockerfile                # Production Container Definition
│   ├── Procfile                  # Platform-as-a-Service Startup (Railway, Heroku)
│   ├── render.yaml               # 1-Click Render.com Blueprint
│   ├── .env.example              # Environment Variable Template
│   └── README.md                 # Backend Hosting Guide
│
├── generated_app/                # Physical Disk Workspace for Generated Code
├── run_app.py                    # Unified Full-Stack Launcher (Single Command)
├── verify_fullstack.py           # Automated Verification Test Suite (13/13 Checks)
└── SUBMISSION_DOSSIER.md         # Production Deliverables & PRD
```

---

## ⚡ Quick Start (Local Run)

Launch the entire full-stack platform with a single command:

```bash
# 1. Activate your virtual environment
.venv\Scripts\activate   # Windows
# or: source .venv/bin/activate (macOS/Linux)

# 2. Start the unified server
python run_app.py
```

Open your browser to:
- **Studio Interface**: [http://localhost:8000](http://localhost:8000)
- **API Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 🌐 Cloud Hosting & Deployment

### Deployment Strategy 1: Unified Full-Stack (Render / Railway / Docker)
Deploy the `backend/` directory or root container. The backend automatically detects the `frontend/` folder and serves all HTML, CSS, JS, and API routes seamlessly:
- **Render**: Connect repository and select `render.yaml` blueprint.
- **Railway**: Connect repository and deploy via `Procfile`.
- **Docker**:
  ```bash
  cd backend
  docker build -t lunor-backend .
  docker run -p 8000:8000 -e GROQ_API_KEY="gsk_..." lunor-backend
  ```

### Deployment Strategy 2: Decoupled Multi-Cloud (Vercel + Render)
Deploy frontend and backend separately on modern serverless edge infrastructure:
1. **Frontend on Vercel or Netlify**:
   - Push repository to GitHub.
   - On Vercel, set Root Directory to `frontend`.
   - Vercel automatically deploys with zero build steps using `frontend/vercel.json`.
2. **Backend on Render or Railway**:
   - Deploy `backend/` using `backend/Dockerfile` or `backend/render.yaml`.
3. **Connect Frontend to Backend**:
   - Open your live Vercel URL.
   - Click the **🌐 API: Local** button in the top navigation bar.
   - Enter your Render backend URL (e.g., `https://lunor-backend.onrender.com`).
   - Click **Save & Connect**!

---

## ☁️ Google Drive Cloud Storage

Lunor automatically backs up all generated mobile app files directly to **Google Drive**:
1. Click **☁️ Google Drive** in the studio header.
2. Choose **⚡ 1-Click Cloud Drive** and enter your Google email address.
3. Every file write, edit, and agent synthesis automatically pushes to `My Drive > LunorApps`.
4. Click **📂 Open LunorApps in Google Drive** to inspect your cloud folder directly on Google Drive.

---

## 🧪 Automated Verification

Run the built-in test suite to verify all routes, API endpoints, and cloud sync:

```bash
python verify_fullstack.py
```

Expected output:
```text
=================================================================
VERIFICATION SUMMARY: 13/13 Passed
=================================================================
>> ALL TESTS PASSED! ZERO ERRORS DETECTED.
```
