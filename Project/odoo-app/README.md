# CVForge → Odoo integration

A custom Odoo 17 addon (`cv_position_viewer`) that works as a **read-only viewer**
for positions and aggregated CV results imported from CVForge.

What it stores per position:

- position title, company, level, number of published CVs;
- the set of attributes — attribute title and type;
- an aggregated result per attribute:
  - **numeric** attributes: filled count, average / min / max;
  - **text-like** attributes (string, select, checkbox, …): a few most popular values with counts.

Access to the data is provided via an **api token generated per position** in CVForge
(position edit form → *External API token* → *Generate token*). A token only grants
access to the data of its own position:

```
GET {cvforge-url}/api/external/position?token=<api-token>
```

## Rolling out Odoo with the addon

Requires Docker:

```bash
cd odoo-app
docker compose up -d
```

1. Open http://localhost:8069 and create a database (any name, remember the master password).
2. Activate developer mode: *Settings → General Settings → Developer Tools → Activate*.
3. *Apps → Update Apps List*, then search for **CVForge Position Viewer** and install it.

## Importing a position

1. In CVForge, open a position for editing (as recruiter/admin) and press
   **Generate token** in the *External API token* section. Copy the token.
2. In Odoo, open the **CVForge** menu → **Import from CVForge**.
3. Paste the CVForge base URL (default is the live Render instance) and the token,
   press **Import**.
4. The position appears under **CVForge → Imported Positions**; re-running the
   import with the same token refreshes the stored aggregates.

The list and form views are read-only (`create="false" edit="false"`) — data can
only enter Odoo through the import action, as required.
