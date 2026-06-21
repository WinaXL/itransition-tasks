# ⚓ Naval Strike

A premium, real-time **multiplayer Battleship** platform. No registration, no passwords — just enter a callsign and command the seas. Many duels run simultaneously between different pairs of players, with live moves pushed instantly over WebSockets (no page reloads).

Built as a portfolio-grade product: a deep-sea naval command-center aesthetic, custom hand-built UI, procedural sound effects, and a clean, modular architecture.

---

## ✨ Features

- **No-auth identity** — pick any name. Duplicates get a visual identifier suffix (`John`, `John 2`, `John 3`, …).
- **Real-time multiplayer** — Socket.io rooms; every move is delivered to the opponent instantly.
- **Concurrent games** — unlimited independent matches between different player pairs.
- **Custom matches** — host picks the **grid size** (8×8 / 10×10 / 12×12) and a fully customizable **ship configuration**.
- **Server-authoritative engine** — all placement validation, turn order, and hit detection happen on the server. Clients cannot cheat.
- **Fog of war** — you only ever receive your own board plus the shots you've taken.
- **Live stats & leaderboard** — per-name win/loss/ships-sunk records, top-5 leaderboard, updated in real time.
- **Polished UX** — animated ocean backdrop, sonar sweeps, explosion/ripple effects, phase transitions, in-game chat, and procedural Web Audio sound effects (no audio assets).
- **Graceful disconnects** — a dropped player has 60s to reconnect before forfeiting; reconnects re-attach to the live game.
- **Responsive** — scales from phones to widescreen via fluid grid cells.

---

## 🧱 Tech Stack

| Layer    | Tech |
|----------|------|
| Server   | Node.js, TypeScript (strict), Express, Socket.io, in-memory state |
| Client   | React 18, TypeScript (strict), Vite, **Tailwind CSS v4** (CSS-first `@theme`), Framer Motion, socket.io-client |
| Realtime | Socket.io (WebSocket + polling fallback) |
| Audio    | Web Audio API (procedurally generated) |

> Tailwind CSS v4 was selected from the [awesome-css-frameworks](https://github.com/troxler/awesome-css-frameworks) list (Utility-based section). The theme is defined CSS-first via `@theme` in `client/src/styles/main.css` — no `tailwind.config.js`.

---

## 📁 Architecture

```
naval-strike/
├── server/                      # Express + Socket.io game server
│   └── src/
│       ├── index.ts             # HTTP + Socket.io bootstrap, serves client build in prod
│       ├── config.ts            # PORT / CLIENT_ORIGIN from env
│       ├── game/
│       │   ├── GameState.ts      # Pure, IO-free Battleship engine (authoritative rules)
│       │   ├── SessionManager.ts # roomId -> session map
│       │   ├── NameRegistry.ts   # name dedup + per-name stats
│       │   ├── configs.ts        # default fleets + config sanitization
│       │   └── types.ts          # domain types
│       └── socket/
│           ├── index.ts          # connection lifecycle, register, reconnect
│           ├── lobbyHandler.ts   # create / list / join / cancel
│           ├── gameHandler.ts    # ready / fire / chat / rematch / leave / forfeit
│           ├── shared.ts         # typed helpers, fog-of-war emit
│           └── protocol.ts       # typed Socket.io event contract
└── client/                      # React + Vite SPA
    └── src/
        ├── context/             # PlayerContext, GameContext (single realtime source of truth)
        ├── hooks/               # useSocket, useLobby, useGame, useSoundFX
        ├── lib/                 # socket singleton, geometry, configs
        ├── components/
        │   ├── ui/              # Button, Badge, Modal, Tooltip, StatusDot
        │   ├── layout/          # Header, OceanBackground, EntryScreen, ErrorToast
        │   ├── lobby/           # LobbyPage, SessionCard, CreateSessionModal, PlayerStats
        │   ├── grid/            # BattleGrid, GridCell, CoordinateLabels, ShipPlacer, SonarSweep
        │   └── game/            # GamePage, PlacementPhase, BattlePhase, GameHeader,
        │                        #   ShipDock, ChatPanel, GameResultModal, EnemyStatus
        └── styles/              # main.css (Tailwind v4 @theme), animations.css
```

The server is **authoritative**: the client renders UI and sends intents (`fire`, `ready`, …); the server validates everything in `GameState` and pushes per-player fog-of-war views.

---

## 🚀 Getting Started

### Prerequisites
- Node.js **20+**

### Install
```bash
npm run install:all
```
(installs root, server, and client dependencies)

### Environment
Copy the example file and adjust if needed:
```bash
cp .env.example .env
```
| Var             | Default                  | Purpose |
|-----------------|--------------------------|---------|
| `PORT`          | `3001`                   | Server port |
| `CLIENT_ORIGIN` | `http://localhost:5173`  | Allowed CORS / Socket.io origin (dev client) |
| `VITE_SERVER_URL` | `http://localhost:3001` | Client → server URL in dev (leave empty in the combined prod build for same-origin) |

### Develop (hot reload, both apps)
```bash
npm run dev
```
- Client: http://localhost:5173
- Server: http://localhost:3001

Open the client in **two browser tabs/windows**, enter two names, create a mission in one and join it from the other.

### Production build & run
```bash
npm run build      # compiles server + builds client
npm start          # serves the API and the built client from one port
```
Then open http://localhost:3001 (the Express server serves the Vite build with SPA fallback).

---

## 🌐 Deployment & Environment Configuration

Production uses a **split deployment**:

| App | Platform | Why |
|-----|----------|-----|
| **Frontend** (`client/`) | [Vercel](https://vercel.com) | Fast static hosting + SPA routing for the Vite build |
| **Backend** (`server/`) | [Render](https://render.com) | Always-on WebSockets for Socket.io (Vercel serverless does not support persistent WS) |

The frontend and backend talk across origins. Each side must know the other's public URL via environment variables — otherwise you will get **CORS errors** or a socket that never connects.

> **In-memory state:** game sessions live in server RAM and reset on restart or redeploy. No database is required for this task.

---

### Environment variables

#### Local development (repo root `.env`)

| Variable | Default | Where used | Purpose |
|----------|---------|------------|---------|
| `PORT` | `3001` | Server | HTTP + Socket.io listen port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Server | Allowed browser origin for CORS / Socket.io |
| `VITE_SERVER_URL` | `http://localhost:3001` | Client (Vite) | Socket.io server URL in dev |

Copy the template and edit as needed:

```bash
cp .env.example .env
```

#### Production (cross-origin: Vercel + Render)

| Variable | Set on | Example | Purpose |
|----------|--------|---------|---------|
| `VITE_SERVER_URL` | **Vercel** (client) | `https://naval-strike-server.onrender.com` | Where the browser connects for Socket.io (**build-time** — redeploy after changing) |
| `CLIENT_ORIGIN` | **Render** (server) | `https://naval-strike.vercel.app` | Which frontend origins may call the API / open WebSockets |
| `NODE_ENV` | Render | `production` | Production mode |
| `PORT` | Render | *(auto)* | Injected by Render — **do not set manually** |

**Rules that prevent CORS / socket failures:**

- Use **`https://`** in production (never `http://`).
- **No trailing slash** on URLs (`https://foo.vercel.app`, not `https://foo.vercel.app/`).
- `CLIENT_ORIGIN` on Render must **exactly match** the origin shown in the browser address bar.
- `VITE_SERVER_URL` is baked in at **build time** — after changing it on Vercel, run `vercel --prod` again.

**Multiple frontend origins (optional):** Render accepts a comma-separated allow-list:

```env
CLIENT_ORIGIN=https://naval-strike.vercel.app,https://naval-strike-git-main-you.vercel.app
```

---

### Step 1 — Push to GitHub

From the repository root (`task6/`):

**Option A — GitHub CLI**

```bash
gh repo create naval-strike --public --source=. --remote=origin --push
```

**Option B — Manual**

1. Create an empty repo on GitHub (e.g. `naval-strike`).
2. Push:

```bash
git remote add origin https://github.com/<your-username>/naval-strike.git
git push -u origin main
```

---

### Step 2 — Deploy frontend to Vercel

Install the CLI and deploy from the **`client/`** directory:

```bash
npm i -g vercel
cd client
vercel login
vercel          # preview deployment (creates the project)
vercel --prod   # production deployment
```

When prompted:

| Prompt | Answer |
|--------|--------|
| Set up and deploy? | **Yes** |
| Link to existing project? | **No** (first time) |
| Project name | e.g. `naval-strike` |
| Directory | `./` (client root) |
| Override settings? | **No** — `client/vercel.json` already configures Vite |

**Vercel settings** (auto-detected or from `vercel.json`):

- **Framework:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **SPA rewrites:** all routes → `/index.html` (for `/game/:roomId`)

Copy your **production URL**, e.g. `https://naval-strike.vercel.app`.

> Socket.io will not work yet — the client still needs the Render backend URL (Step 4).

---

### Step 3 — Deploy backend to Render

Socket.io requires a **persistent WebSocket** process. Render runs the Node server 24/7.

#### Option A — Blueprint (recommended)

The repo includes `render.yaml` at the root.

1. [Render Dashboard](https://dashboard.render.com) → **New +** → **Blueprint**.
2. Connect your GitHub repository.
3. Render detects `naval-strike-server` with `rootDir: server`.
4. When prompted for **`CLIENT_ORIGIN`**, enter your Vercel URL from Step 2 (no trailing slash).
5. Click **Apply**.

#### Option B — Manual Web Service

1. **New +** → **Web Service** → connect the same GitHub repo.
2. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `naval-strike-server` |
| **Root Directory** | `server` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |

3. **Environment** tab:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `CLIENT_ORIGIN` | `https://naval-strike.vercel.app` *(your Vercel URL)* |

4. Create the service.

Copy your **Render URL**, e.g. `https://naval-strike-server.onrender.com`.

> **Free tier:** the service sleeps after ~15 minutes idle; the first request after sleep may take 30–50 seconds (cold start). Fine for demos and portfolio submissions.

---

### Step 4 — Connect frontend ↔ backend

The two services must reference each other:

```
Browser (Vercel)  ──WebSocket/HTTP──►  Render (Socket.io server)
                         ▲
                         └── CORS allows only CLIENT_ORIGIN (Vercel URL)
```

**On Vercel** — set the backend URL and redeploy:

```bash
cd client
vercel env add VITE_SERVER_URL production
# When prompted, paste: https://naval-strike-server.onrender.com  (no trailing slash)

vercel --prod   # rebuild so VITE_SERVER_URL is embedded in the bundle
```

**On Render** — confirm `CLIENT_ORIGIN` matches your live Vercel URL exactly. If you changed the Vercel domain, update Render and **Manual Deploy → Clear build cache & deploy** (or push a commit).

---

### Step 5 — Verify production

1. **Backend health:** open `https://<your-render-url>/api/health`  
   Expected: `{"status":"ok","uptime":...}`

2. **Frontend:** open your Vercel URL in **two browser windows**, enter two names, create a mission, join from the other tab.

3. **DevTools → Network → WS:** a `socket.io` request should show **101 Switching Protocols**. The console should have **no CORS errors**.

**If something fails:**

| Symptom | Likely fix |
|---------|------------|
| CORS error in console | `CLIENT_ORIGIN` on Render does not exactly match the browser URL (check `https`, no trailing slash) |
| Socket connects then fails | `VITE_SERVER_URL` wrong or missing — set on Vercel and run `vercel --prod` again |
| Long delay on first load | Render free tier cold start — wait ~30s and retry |
| 404 on `/game/...` refresh | Redeploy Vercel — `client/vercel.json` SPA rewrites must be active |

---

### Alternative — single-host deployment

For local demos or a host that runs Node + serves static files, you can use the **combined build** (no Vercel/Render split):

```bash
npm run build
npm start
```

Open http://localhost:3001. Leave `VITE_SERVER_URL` empty so the client uses same-origin Socket.io. Set `CLIENT_ORIGIN` to that same origin in production.

---

## 🎮 How to Play

1. Enter a callsign (your visual identifier).
2. **Create a mission** (choose grid size + fleet) or **join** an open one from the lobby.
3. **Place your fleet**: click to place, click a ship to remove, press **R** to rotate, or hit **Randomize**.
4. Lock in with **Ready for Battle**. When both fleets are set, the battle begins.
5. Fire at the **Enemy Waters** grid on your turn. A hit lets you fire again; a miss passes the turn.
6. Sink the entire enemy fleet to win. Rematch or return to the lobby.

---

## 🧪 Validated

The full multiplayer loop is verified end-to-end: name deduplication, session create/list/join, server-validated fleet submission, turn enforcement, hit/sunk detection, win conditions, and live stat/leaderboard updates.
