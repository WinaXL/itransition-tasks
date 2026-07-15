# CVForge — CV Management Platform (Course Project)

A web-based recruitment platform: Recruiters define **positions** (CV templates) from a reusable **attribute library**; Candidates maintain a profile and get **automatically generated CVs** for the positions they can access.

## Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 19 + TypeScript, Vite, Tailwind CSS 4, react-router, react-i18next (EN/RU), react-select, react-dropzone, react-markdown, react-tagcloud, lucide-react |
| Backend   | Node.js, Express, TypeScript |
| ORM / DB  | Prisma + PostgreSQL (full-text search via native `to_tsvector` / `websearch_to_tsquery`) |
| Auth      | Google OAuth, GitHub OAuth, email+password (JWT in an httpOnly cookie) |
| Images    | Cloudinary (drag-and-drop unsigned upload straight from the browser; never touch our server/DB) |

## Key design decisions

- **Single master value per (user, attribute)** — the `AttributeValue` table has a unique `(userId, attributeId)` key. CVs never store content; they are *assembled at read time* from the profile + the position template. Editing a value inside a CV edits the profile value, so it changes everywhere.
- **Optimistic locking everywhere** — every editable entity (`Attribute`, `Position`, `Project`, `AttributeValue`, …) carries an integer `version`. Updates run `UPDATE … WHERE id = ? AND version = ?` and increment the version; zero affected rows → HTTP 409 → the client reloads the fresh value and shows a conflict message.
- **Auto-save** — profile/CV edits are tracked locally and flushed in one batch every ~6 s (not per keystroke), each value carrying its version.
- **Access rules** — a position is either public or restricted by typed filters over attribute values (`IELTS Score > 7`, `Remote Work checked`, `Presentation Skills = Advanced`). Losing access *hides* CVs (nothing is deleted).
- **Cascade deletion in the database** — deleting a user/position/attribute cleans up values, CVs, likes, comments and links via `ON DELETE CASCADE`; zero manual cleanup code.
- **No per-row buttons** — all tables use checkbox selection + a toolbar (and click-to-open rows).
- **Discussions** — Markdown posts, chronological, updates delivered to all viewers within ~3 s via incremental polling (`?after=<timestamp>`).

## Project layout

```
Project/
├── server/            Express API
│   ├── prisma/        schema.prisma + seed.ts
│   └── src/
│       ├── auth.ts    JWT session + role guards
│       ├── lock.ts    optimistic-locking helper
│       ├── access.ts  position access-rule evaluation
│       └── routes/    auth, attributes, positions, profile, cvs, misc(search/home/users)
└── client/            React SPA (Vite + Tailwind)
    └── src/
        ├── components/  DataTable, AttributePicker, AttributeInput, TagSelect, Layout, Md
        ├── pages/       Home, Login, Positions, PositionEdit, PositionView, Profile, CvPage, AttributesPage, SearchResults, AdminUsers
        ├── useAutoSave.ts
        └── i18n.ts      EN / RU dictionaries
```

## Running locally

Requirements: Node 20+, a PostgreSQL database (Render/Neon free tier works).

```bash
npm run install:all
cp server/.env.example server/.env   # fill DATABASE_URL, JWT_SECRET, OAuth keys
npm run db:push                      # create tables
npm run db:seed                      # categories, built-in attributes, demo users
npm run dev                          # server :3000 + client :5173
```

Demo logins after seeding (password `Passw0rd!`):

- `admin@example.com` — Administrator
- `recruiter@example.com` — Recruiter
- `candidate@example.com` — Candidate

### OAuth setup

- Google: create OAuth credentials at console.cloud.google.com → redirect URI `<API_URL>/api/auth/google/callback`
- GitHub: github.com/settings/developers → callback `<API_URL>/api/auth/github/callback`

### Image uploads (Cloudinary)

Create an unsigned upload preset and set the same vars **locally** (`client/.env`) and **on Render** (Build-time env vars — Vite inlines `VITE_*` during `npm run build`):

```
VITE_CLOUDINARY_CLOUD=your-cloud-name
VITE_CLOUDINARY_PRESET=your-unsigned-preset
```

Without these vars the image attribute falls back to a plain URL field. After changing them on Render, trigger a new deploy so the client rebuild picks them up.

## Deployment (Render)

Root Directory: `Project`

| Setting | Value |
|---------|--------|
| Build Command | `npm install --include=dev && npm run build && npm run db:push` |
| Start Command | `npm start` |
| Node version | `20.x` (from `package.json` engines) |

Link your existing Postgres as `DATABASE_URL`. Also set `JWT_SECRET`, and after deploy set `APP_URL` / `API_URL` to the public service URL (e.g. `https://cvforge.onrender.com`) for OAuth redirects.

`render.yaml` matches the same settings if you import a Blueprint.

## Roles summary

| Action | Anonymous | Candidate | Recruiter | Admin |
|---|---|---|---|---|
| Browse positions, home stats | ✓ | ✓ | ✓ | ✓ |
| Manage own profile / projects / CVs | | ✓ | | ✓ (as owner) |
| Create/edit/delete positions & attributes | | | ✓ | ✓ |
| View published CVs, like, export CSV | | | ✓ | ✓ |
| Manage users (roles, block, delete) | | | | ✓ |
