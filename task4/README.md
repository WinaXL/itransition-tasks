# User Management Admin Panel

A production-ready, full-stack User Management application built as a monorepo.

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS + React Router v6 + Axios |
| Backend  | Node.js + Express + JWT + bcryptjs |
| Database | PostgreSQL (native `pg` driver) |

---

## Project Structure

```
task4/
├── backend/
│   ├── controllers/
│   │   ├── authController.js   # Register (23505 intercept) & Login
│   │   └── userController.js   # CRUD + bulk block/unblock/delete + verify
│   ├── db/
│   │   └── pool.js             # pg-Pool singleton
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT verify + live DB status check (anti-kick)
│   ├── routes/
│   │   ├── auth.js
│   │   └── users.js            # All routes guarded by authMiddleware
│   ├── schema.sql              # Table DDL + unique index on email
│   ├── server.js
│   └── .env                    # Fill in your PostgreSQL credentials
└── frontend/
    └── src/
        ├── api/axios.js        # Axios instance with JWT interceptor
        ├── contexts/AuthContext.jsx
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   └── Dashboard.jsx
        ├── components/
        │   ├── Toolbar.jsx     # Block / Unblock / Delete
        │   └── UserTable.jsx   # Sortable table with checkboxes + Verify Email
        └── utils/time.js
```

---

## Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14 running locally (or any accessible host)
- **psql** CLI available in PATH

---

## Step 1 – Configure the environment

Open `backend/.env` and fill in your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=user_management
DB_USER=postgres
DB_PASSWORD=<your password>
```

The `JWT_SECRET` is already pre-generated; you can replace it with your own 64-byte random value.

---

## Step 2 – Create the database and run the migration

```powershell
# Create the database (if it doesn't exist)
psql -U postgres -c "CREATE DATABASE user_management;"

# Run the schema migration
psql -U postgres -d user_management -f backend/schema.sql
```

The migration creates:
- `users` table with `id`, `name`, `email`, `password`, `status`, `last_login`, `created_at`
- `CREATE UNIQUE INDEX uidx_user_email ON users (email)` — uniqueness is enforced at the DB level; the backend catches error code `23505` and returns `"This email is already taken."`

---

## Step 3 – Start the backend

```powershell
cd backend
npm start          # production
# or
npm run dev        # development (node --watch)
```

Backend runs on **http://localhost:5000**.

---

## Step 4 – Start the frontend

```powershell
cd frontend
npm run dev
```

Frontend runs on **http://localhost:5173** and proxies all `/api` calls to the backend.

---

## Key Architectural Decisions

### 1. DB-level unique constraint (not code-level check)
`schema.sql` creates `CREATE UNIQUE INDEX uidx_user_email ON users (email)`.  
`authController.js` wraps the `INSERT` in a `try/catch` and checks `err.code === '23505'` to return a clean 400 with `"This email is already taken."`.

### 2. Centralized Anti-Kick Middleware
`middleware/authMiddleware.js` is applied to **every** protected route via `router.use(authMiddleware)`.  
On each request it:
1. Verifies the JWT signature/expiry.
2. Queries the DB: `SELECT id, status FROM users WHERE id = $1`.
3. If the row is missing → 401 `{ kicked: true }`.
4. If `status = 'Blocked'` → 403 `{ kicked: true }`.

The React `AuthContext` handles any response with `kicked: true` by wiping `localStorage` and redirecting to `/login` with a notification message. No WebSockets needed.

### 3. Table sort order
`GET /api/users` uses `ORDER BY last_login DESC NULLS LAST` — never in JavaScript.

### 4. Status values
| Value | Meaning |
|-------|---------|
| `Unverified` | Newly registered — can log in, can manage others, but badge shows amber "Unverified" |
| `Active` | Email verified or manually unblocked |
| `Blocked` | Cannot log in; kicked on next request if already logged in |

### 5. Simulated email verification
The "Verify Email" button in the table calls `PATCH /api/users/:id/verify`.  
It updates `status = 'Active'` only when current status is `'Unverified'`.

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login`    | — | Login, get JWT |
| GET  | `/api/users`         | ✓ | List all users (sorted) |
| PATCH | `/api/users/block`  | ✓ | Block users `{ ids: [] }` |
| PATCH | `/api/users/unblock`| ✓ | Unblock users `{ ids: [] }` |
| DELETE | `/api/users`       | ✓ | Delete users `{ ids: [] }` |
| PATCH | `/api/users/:id/verify` | ✓ | Mark email as verified |
