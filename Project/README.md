# CVForge — CV Management Platform (Course Project)

A web-based recruitment platform: Recruiters define **positions** (CV templates) from a reusable **attribute library**; Candidates maintain a profile and get **automatically generated CVs** for the positions they can access.

**Live application:** https://cv-management-tdgj.onrender.com

## What is implemented

### Authentication and authorization

- Email/password registration and sign-in.
- Google and GitHub OAuth.
- JWT sessions stored in an HTTP-only, same-site cookie.
- Candidate, Recruiter and Administrator role guards on both routes and API endpoints.
- Administrator user management: list users, assign/remove roles, block/unblock and delete.
- Anonymous users can browse positions, search public data and see platform statistics.

### Reusable attribute library

- Recruiters and Administrators can create, edit and delete shared attributes.
- Supported types: string, Markdown text, image, number, date, date period, boolean and dropdown.
- Globally unique attribute names, predefined category lookup records and dropdown options.
- Built-in profile fields use the same engine but cannot be deleted or retyped.
- Attribute picker supports prefix lookup, category filtering and recently used attributes.
- Images use direct drag-and-drop uploads to Cloudinary; image bytes are never stored by this application.

### Position templates

- Shared position table managed by all Recruiters (there is no position ownership).
- Create a blank position, duplicate one, edit it or delete it.
- Configure title, description, company, level, visibility and maximum project count.
- Select and order reusable attributes.
- Restrict access with type-aware rules such as numeric comparisons, dropdown equality and boolean checks.
- Filter generated CV projects by technology tags.
- Candidate access is recalculated from current profile values; losing access hides an existing CV without copying or rewriting it.

### Profiles and projects

- Profile sections for built-in personal details, selected library attributes, projects and CVs.
- One canonical value for each `(candidate, attribute)` pair.
- Auto-save batches local edits about every six seconds rather than writing on each keystroke.
- Projects have date ranges, Markdown descriptions and creatable tags with autocomplete.
- Profile and CV editors share the same values: editing either view updates the same database row.

### Generated CVs

- At most one CV per candidate and position.
- CV content is assembled dynamically from profile values, position attributes and matching recent projects.
- Missing values are highlighted and can be edited in place by the owner or an Administrator.
- Draft/published state; publishing is rejected until all position attributes are filled.
- Recruiters get a rendered read-only view and can like a published CV once.
- Position CV lists are structured tables with dynamic attribute columns, sorting, likes and numeric averages.
- Recruiters can export a position's published CV table as CSV.

### Search, discussions and dashboard

- PostgreSQL full-text search for positions, attributes and authorized CV data.
- Search is available from the global header.
- Position discussions support Markdown and incremental three-second polling.
- Dashboard shows latest positions, popular positions, public statistics and a technology tag cloud.

### User interface

- Tailwind CSS responsive layout for desktop, tablet and mobile.
- Compact responsive navigation drawer containing links, search, theme, language and account controls.
- Tables use selection checkboxes and shared toolbars instead of action buttons in every row.
- English and Russian UI with live language switching, including built-in attribute names, placeholders, categories and generated CV columns.
- Light and dark themes; language/theme preferences are persisted.

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
- **Relational CV storage** — attributes, templates and values are normalized relations rather than JSON documents or dynamically-created database tables. Renaming an attribute therefore updates every generated view without batch-rewriting CVs.
- **Set-based data access** — related values are fetched in batches; database queries are not executed inside record-rendering loops.
- **No per-row buttons** — all tables use checkbox selection + a toolbar (and click-to-open rows).
- **Discussions** — Markdown posts, chronological, updates delivered to all viewers within ~3 s via incremental polling (`?after=<timestamp>`).

## Main data model

- `User` stores identity, role, blocked state and UI preferences.
- `AttributeCategory` and `Attribute` define the reusable field library.
- `AttributeValue` stores one master value for a user and attribute, plus a numeric projection for comparisons/aggregates.
- `Position`, `PositionAttribute`, `PositionTag` and `AccessRule` define a CV template and its access/project filters.
- `Project`, `Tag` and `ProjectTag` store reusable candidate projects.
- `Cv` stores creation/status metadata only; generated content is looked up.
- `Like` enforces one like per Recruiter/CV with a composite primary key.
- `Comment` stores chronological Markdown discussion posts.

Most dependent records use database-level `ON DELETE CASCADE` constraints.

## Request flow

1. Express attaches the current user from the signed JWT cookie.
2. Route middleware verifies authentication and role permissions.
3. Zod validates request bodies.
4. Prisma executes parameterized PostgreSQL operations.
5. Versioned writes include the client's current version and increment it atomically.
6. The React client updates its local version or presents a conflict/reload message.

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
        ├── localization.ts  translation mapping for system-defined DB labels
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

Other useful commands:

```bash
npm run build                        # type-check and build server + client
npm start                            # run the production Express server
npm run db:push                      # synchronize the Prisma schema
npm run db:seed                      # idempotently add lookup/demo data
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

Required runtime/build environment variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string; Render external URLs should use `?sslmode=require` |
| `JWT_SECRET` | Long random secret used to sign session tokens |
| `APP_URL` | Public frontend URL used after OAuth |
| `API_URL` | Public API URL used to construct OAuth callbacks |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth credentials |
| `VITE_CLOUDINARY_CLOUD`, `VITE_CLOUDINARY_PRESET` | Public Cloudinary unsigned-upload configuration baked into the SPA |

Never commit `.env` files or OAuth/database secrets. The repository tracks only placeholder `.env.example` files.

## Roles summary

| Action | Anonymous | Candidate | Recruiter | Admin |
|---|---|---|---|---|
| Browse positions, home stats | ✓ | ✓ | ✓ | ✓ |
| Manage own profile / projects / CVs | | ✓ | | ✓ (as owner) |
| Create/edit/delete positions & attributes | | | ✓ | ✓ |
| View published CVs, like, export CSV | | | ✓ | ✓ |
| Manage users (roles, block, delete) | | | | ✓ |

## Verification

- Client TypeScript compilation and Vite production build are run with `npm --prefix client run build`.
- Server Prisma Client generation and TypeScript compilation are run with `npm --prefix server run build`.
- Render checks `/api/health`; a healthy response is `{ "ok": true }`.
- The deployment build synchronizes the Prisma schema before starting the web service.
