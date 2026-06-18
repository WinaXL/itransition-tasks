# Soundforge — Procedural Music Store

A single-page application that simulates a music-store showcase by generating
**fake but realistic** song data entirely on the server. The browser requests
paginated batches; all generation is in-memory and fully reproducible from a
seed.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS, Web Audio API (deploy on Vercel)
- **Backend:** Node.js + Express + TypeScript, `@faker-js/faker`, `seedrandom` (deploy on Render)
- **Storage:** none required for generation (in-memory). PostgreSQL/Supabase is
  only needed if you later add localization lookup tables.

---

## Repository layout

```
task5/
├── backend/     Express API + seeded generation logic
└── frontend/    React SPA (toolbar, table view, gallery view)
```

---

## Core design

### Independent parameters via nested seeds

Region (locale), Seed, and Likes are independent. Changing **likes** updates
**only** like/review counts; titles, artists, covers and audio never change.
Changing **seed** or **region** regenerates everything.

This is achieved with a nested-seed RNG architecture (`seedrandom`):

1. **Master RNG** for a batch is seeded from `seed + page` and produces one
   unique **song seed** per row.
2. For each song, a **content RNG** is instantiated from the song seed and drives
   title, artist, album, genre, cover, audio and lyrics. `faker` is also seeded
   deterministically from the song seed.
3. A **separate likes RNG** is instantiated from `songSeed + ":likes"` and drives
   **only** the like and review counts/text.

Because the content stream and the likes stream are separate RNGs, moving the
likes slider can never disturb core content. See
`backend/src/songGenerator.ts`.

### Fractional likes (probabilistic distribution)

The user sets an average (0–10, fractional). `resolveFractional(avg, rng)` floors
the average and bumps it up by one with probability equal to the fractional part
(e.g. `4.7` → `5` with p=0.7, else `4`). Over a batch this averages to the target,
and the displayed value is always an integer. See `backend/src/likes.ts`.

### Album cover images

Each song gets a **real, photographic** cover. The server deterministically
picks a theme keyword (lake, clouds, dog, people, city, retro, …) from the
song's cover RNG and builds a [LoremFlickr](https://loremflickr.com) URL locked
to a seed-derived number, so the same song always yields the same photo
(`backend/src/cover.ts`). A seeded Picsum URL is provided as a fallback. The
title/artist are overlaid on the client by `frontend/src/components/CoverArt.tsx`,
which renders one of **five distinct typography styles** (minimalist scrim,
brutalist block, glassmorphism card, elegant serif header, accent-bar) — also
chosen deterministically per seed — for highly varied artwork across the catalog.

### Procedural audio

The server emits a deterministic `AudioSpec` (BPM, root/scale, synth timbres,
melody + bass note events). The client renders it with the native **Web Audio
API** (oscillator + gain voices via a look-ahead scheduler), so the same seed
always yields the same track, with tempo and melody variation per song, and it
works consistently across browsers. See `backend/src/audio.ts` and
`frontend/src/audio/player.ts`.

### Synced lyrics

Each lyric line carries a `time` (seconds). During playback the client tracks the
loop position via `requestAnimationFrame` and highlights/auto-scrolls the active
line. See `frontend/src/components/SongDetails.tsx`.

---

## API

```
GET /api/songs?seed=<string>&page=<int>&locale=<en|de|uk>&likes=<0..10>
```

Returns a `SongsResponse` with `pageSize` (20) songs. `index` is sequential and
continues across pages (starts at 1). `GET /health` returns service info.

---

## Running locally

Two terminals.

**Backend**

```bash
cd backend
npm install
npm run dev        # http://localhost:4000
```

**Frontend**

```bash
cd frontend
npm install
# optional: copy .env.example to .env and set VITE_API_URL
npm run dev        # http://localhost:5173
```

Open http://localhost:5173.

---

## UI

- **Toolbar (single row):** Language dropdown · Seed input + random shuffle button
  · Average-likes slider/number · Table/Gallery toggle.
- **Reactivity:** parameter changes are debounced and applied immediately — no
  submit button.
- **Table view:** expandable rows (cover, player, synced lyrics, reviews) with
  classic pagination.
- **Gallery view:** infinite scroll, fetching new batches from the backend.
- **State resets:** changing any generation parameter resets the table to page 1
  and the gallery scroll to the top.

---

## Deployment

### Backend → Render

`backend/render.yaml` is a blueprint: Node runtime, `npm install && npm run build`,
`npm start`, health check at `/health`. Set the service root to `backend/`.

### Frontend → Vercel

`frontend/vercel.json` configures the Vite build. Set the project root to
`frontend/` and add an environment variable `VITE_API_URL` pointing at the
deployed Render backend URL.
```
