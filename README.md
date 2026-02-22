# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Google AdSense Setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_ADSENSE_PUBLISHER_ID` with your real `ca-pub-...` value.
3. Add ad unit slot values when available (after approval if needed):
   - `VITE_ADSENSE_SLOT_HOMEPAGE_MIDDLE_AD`
   - `VITE_ADSENSE_SLOT_STORIES_FOOTER_AD`
   - `VITE_ADSENSE_SLOT_STORY_TOP_AD`
   - `VITE_ADSENSE_SLOT_STORY_BOTTOM_AD`
   - You can keep these empty during pre-approval site verification.
4. Rebuild and deploy with the same env vars on your hosting (for Vercel, set project env vars in Dashboard).
5. Verify in Google AdSense:
   - `AdSense code snippet`: already included in `index.html` head.
   - `Meta tag`: already included in `index.html` head (`google-adsense-account`).
   - `Ads.txt snippet`: generated to `dist/ads.txt` automatically from `VITE_ADSENSE_PUBLISHER_ID`.
6. Confirm live checks:
   - `https://mahean.com/ads.txt` returns `google.com, pub-..., DIRECT, f08c47fec0942fa0`
   - Page source contains `google-adsense-account` and `adsbygoogle.js?client=ca-pub-...`
7. Run readiness validation after build:
   - `npm run adsense:check`
   - This verifies AdSense head snippet, `ads.txt`, legal routes, and `robots.txt` crawl settings in `dist/`.

Notes:
- In production, ads render only when publisher ID + valid slot are configured.
- In development, placeholder boxes are shown for easier placement checking.
- Cookie notice is shown on public pages and links to Privacy Policy + Google Ad Settings.

## cPanel Data Mode (No Supabase)

This project now runs in **cPanel local server mode** with two backend options:

- `DB_BACKEND=json` (legacy/local): data in `data/*.json` and `data/users.json`.
- `DB_BACKEND=mysql` (recommended): data in cPanel MySQL/phpMyAdmin tables.

API layer is unchanged:

- App data via `/api/db`.
- Auth/users via `/api/auth` and `/api/admin-users`.
- Image uploads are stored in `dist/uploads/...` through `/api/upload-image`.
- `data/` runtime files are intentionally not tracked in git.

### Required cPanel env vars

- `DB_BACKEND=mysql`
- `MYSQL_HOST`
- `MYSQL_PORT` (usually `3306`)
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `MYSQL_TABLE_PREFIX` (optional, default: `app_table`)
- `MYSQL_USERS_TABLE` (optional, default: `app_users`)
- `PRIMARY_ADMIN_EMAIL` (optional, default: `mahean4bd@gmail.com`)
- `PRIMARY_ADMIN_PASSWORD` (**required in production**, use a strong unique value)
- `AUTH_SESSION_SECRET` (**required in production**, long random secret)
- `AUTH_SECURE_COOKIES=true` (recommended in production)
- `ALLOW_RESET_TOKEN_RESPONSE=false` (recommended in production)
- `ALLOWED_ORIGINS=https://www.mahean.com,https://mahean.com` (recommended)
- `CRON_SECRET` (recommended if cleanup endpoint is used)
- `VITE_ALLOW_LOCAL_AUTH_FALLBACK=false` (recommended in production)

### JSON -> phpMyAdmin migration (one-time)

1. Keep your current JSON files in `data/` (`table-*.json`, `users.json`).
2. Set MySQL env vars in cPanel Node.js app and set `DB_BACKEND=mysql`.
3. In cPanel Terminal (inside app root) run:
   - `npm run db:init`
   - `npm run db:migrate:mysql -- --source ./data --truncate`
   - `touch tmp/restart.txt`
4. Verify login/admin/stories on live site.
5. After verification, you can keep JSON files as backup or archive them.

### Google Login setup (cPanel)

1. In Google Cloud Console create OAuth client: **Web application**.
2. Add Authorized JavaScript origins:
   - `https://www.mahean.com`
   - `https://mahean.com`
3. Add Authorized redirect URI (must match exactly):
   - `https://www.mahean.com/admin/dashboard`
4. In cPanel Node.js app environment set:
   - `VITE_GOOGLE_OAUTH_ENABLED=true`
   - `GOOGLE_OAUTH_CLIENT_ID=...`
   - `GOOGLE_OAUTH_CLIENT_SECRET=...`
   - `GOOGLE_OAUTH_REDIRECT_URI=https://www.mahean.com/admin/dashboard`
   - `GOOGLE_OAUTH_ALLOWED_REDIRECT_ORIGIN=https://www.mahean.com`
5. Rebuild and restart app.
6. Test from `/login` and `/signup` using the Google button.

### Security hardening already included

- Passwords are stored as scrypt hashes (auto-migrates old plain-text records on first read).
- Auth now uses signed server-side session tokens (cookie + bearer support) instead of trusting client `actorId`.
- `/api/db` now enforces table allowlists and role-based permissions for read/write access.
- `/api/upload-image` requires authenticated session, applies rate limits, and validates MIME by file signature.
- Password reset now uses short-lived signed reset tokens (with optional response disable in production).
- Auth/admin/db/upload APIs now have request-size limits, cross-site origin checks, and IP-based rate limiting.
- Node server now sets security headers and static asset ETag/Last-Modified caching.

### First deploy checklist

1. Upload/extract project files to app root.
2. In Node.js app config:
   - App root: your project folder
   - Startup file: `server.js`
3. Run `npm install`.
4. Restart Node app.
5. Open `/login` and sign in with primary admin credentials.
6. Immediately change default/temporary admin password if you used one.

### GitHub auto deploy (stable)

This repo includes `.github/workflows/deploy.yml` for automatic cPanel deploy on push to `main`/`master`.

Required repository secrets:

- `CPANEL_HOST` (example: `ms-154.servly.top`)
- `CPANEL_PORT` (usually `22`)
- `CPANEL_USER` (example: `mahean`)
- `CPANEL_PASSWORD` (optional fallback; if set, workflow can deploy using password auth via `sshpass`)
- `CPANEL_SSH_KEY` (private key content, raw multiline)
- `CPANEL_SSH_KEY_B64` (optional alternative: base64-encoded private key)
- `CPANEL_SSH_PASSPHRASE` (optional, only if your SSH key is encrypted)
- `CPANEL_APP_DIR` (optional, default: `/home/<CPANEL_USER>/main_mahean.com`)
- `CPANEL_NODE_VENV_ACTIVATE` (optional, default: `/home/<CPANEL_USER>/nodevenv/<app_dir_name>/20/bin/activate`)

What the workflow does:

1. Build app in GitHub Actions (`npm ci`, `npm run build`).
2. Uploads deploy bundle to `/home/<CPANEL_USER>/` and extracts it into app dir.
3. Runs `npm install --include=dev`, `npm run db:init`, optional `npm run db:fix-encoding`, then triggers restart via `tmp/restart.txt`.
4. Verifies `https://www.mahean.com/healthz` returns `ok`.

Note: workflow does **not** auto-run JSON->MySQL migration on every deploy. Run migration once manually when switching backend.

If GitHub Actions is blocked (for example, billing/account lock), deploy manually from Windows:

```powershell
pwsh -File scripts/deploy-cpanel.ps1 `
  -Host ms-154.servly.top `
  -User mahean `
  -Port 22 `
  -KeyPath "$HOME/.ssh/id_rsa" `
  -BuildFirst
```

You can also pass a different app path with `-AppDir` if needed.
