# Lunor AI Autonomous Agent — Frontend Studio

Modern, decoupled static web client for Lunor.AI — the autonomous mobile app development agent.

---

## 🌟 Architecture & Features

- **Decoupled Client Architecture**: Pure HTML5, CSS3, and modern ES6+ JavaScript. No bloated build step required.
- **Physical Workspace Tree**: Live real-time reflection of disk workspace files (`generated_app/`) and Google Drive cloud folders.
- **Bi-Directional Code Editing**: Interactive Monaco-like editor with syntax highlighting, gutter line numbering, and disk persistence (`Ctrl+S`).
- **Interactive Virtual DOM Mobile Simulator**: Interactive phone canvas supporting iOS (iPhone 15) and Android (Pixel 8) form factors.
- **Live Agent Terminal**: Real-time SSE streaming trace of agent thought steps, reasoning, and tool calls.
- **Decoupled API Routing**: Supports both unified hosting (served directly by Python backend) and multi-cloud split deployment (Frontend on Vercel/Netlify, Backend on Render/Railway).

---

## 🚀 Quick Start (Local)

### Serving with Python
```bash
# From within the frontend/ directory:
python -m http.server 3000
```
Then visit `http://localhost:3000`. Click the **🌐 API: Local** button in the top right to configure your backend URL (e.g., `http://localhost:8000`).

### Serving with Node.js
```bash
npx serve .
```

---

## 🌐 1-Click Hosting Deployments

### Option 1: Vercel
1. Install Vercel CLI (`npm i -g vercel`) or deploy via [vercel.com](https://vercel.com).
2. Set Root Directory to `frontend/` (or run `vercel` inside `frontend/`).
3. Vercel automatically reads `vercel.json`.
4. Once deployed, open your live Vercel URL and set your backend URL via the **🌐 API** button or set `window.LUNOR_API_BASE = "https://your-backend.onrender.com"`!

### Option 2: Netlify
1. Connect your repository to [Netlify](https://netlify.com).
2. Set Base directory to `frontend/` and Publish directory to `.`.
3. Netlify automatically detects `netlify.toml`.
4. Deploy!

### Option 3: Cloudflare Pages / GitHub Pages
1. Push this repository to GitHub.
2. Under Repository **Settings** -> **Pages**, choose the `frontend` folder as the source branch / directory.
3. Your site will be live instantly with global CDN caching.

---

## 🔗 Connecting to the Backend

By default, the studio connects to the same origin (`/api/...`).
To connect to an external hosted backend (e.g., on Render, Railway, or AWS):
1. Click the **🌐 API: Local** button in the studio header.
2. Enter your backend URL (e.g. `https://lunor-backend.onrender.com`).
3. Click **Save & Connect**. The setting persists in `localStorage`.
