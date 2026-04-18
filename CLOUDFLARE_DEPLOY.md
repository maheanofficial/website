# Cloudflare Full-Site Deploy (Workers + D1 + R2)

This project supports a fully Cloudflare-native stack:
- Frontend static assets from `dist/` (Workers Assets binding)
- Backend API from the same Worker (`cloudflare/worker.js`)
- Database from Cloudflare D1 (`DB_BACKEND=d1`)
- Image uploads from Cloudflare R2 (`UPLOADS_BUCKET` binding)

## 1) Required Cloudflare Token Scopes

Your API token must include at least:
- `Account - D1 - Edit`
- `Account - Workers Scripts - Edit`
- `Account - Workers Routes - Edit`
- `Account - Account Settings - Read`
- `Zone - DNS - Edit` (only if DNS changes are needed)

Without D1 scope, database migration/cutover cannot be completed.

## 2) Create D1 Database

```bash
npx wrangler d1 create mahean-fullsite-db
```

Add the returned `database_id` to `wrangler.toml`:

```toml
[[d1_databases]]
binding = "D1_DB"
database_name = "mahean-fullsite-db"
database_id = "REPLACE_WITH_DATABASE_ID"
```

## 3) Export Current MySQL Data To D1 SQL

```bash
npm run db:export:d1-sql
```

This generates `tmp/d1-seed.sql` from:
- `app_table_*` tables -> logical app tables
- `app_users` -> logical `users` table

## 4) Import Into D1 (Remote)

```bash
npx wrangler d1 execute mahean-fullsite-db --remote --file tmp/d1-seed.sql
```

## 5) Switch Runtime To D1

Update `wrangler.toml` vars:

```toml
[vars]
DB_BACKEND = "d1"
D1_BINDING = "D1_DB"
```

MySQL secrets are no longer required after cutover.

## 6) Required Secrets (Non-DB)

```bash
wrangler secret put AUTH_SESSION_SECRET
wrangler secret put PRIMARY_ADMIN_PASSWORD
wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
```

Optional:

```bash
wrangler secret put GOOGLE_OAUTH_CLIENT_ID
wrangler secret put GOOGLE_OAUTH_REDIRECT_URI
wrangler secret put GOOGLE_OAUTH_ALLOWED_REDIRECT_ORIGIN
wrangler secret put BLOCKED_STORY_SUBMITTER_IDS
wrangler secret put BLOCKED_ACTOR_IDS
```

## 7) Configure R2 Uploads

```toml
[[r2_buckets]]
binding = "UPLOADS_BUCKET"
bucket_name = "mahean-uploads-prod"
preview_bucket_name = "mahean-uploads-preview"
```

## 8) Deploy

```bash
npm run build:cf
npm run deploy:cf
```

## 9) Verify

- `GET /healthz`
- `POST /api/auth` with `{ "action": "google-oauth-config" }`
- `POST /api/db` with `{ "action":"select","table":"stories","limit":1 }`
- Existing `/uploads/...` URLs still resolve
