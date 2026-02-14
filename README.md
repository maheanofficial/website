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

## Image Uploads (Supabase Storage)

Admin image uploads (story covers, avatars, category images) are stored as **Supabase Storage public URLs** when a bucket is configured.

- Default bucket: `mahean-media` (configurable via `VITE_SUPABASE_STORAGE_BUCKET`)
- Required Storage policies: see `supabase-schema.sql` section "Storage Bucket for Uploaded Images"

If Storage upload fails (bucket/policy/session issues), the UI falls back to storing the image as a base64 data URL in the database (legacy behavior).
