# Chinese Stroop

Static Stroop task: English color word with colored ink, choose the correct **simplified Chinese** label. Three levels (congruent; incongruent + pinyin; incongruent only). Session stats use `localStorage` under the `chineseStroop_` prefix.

## GitHub Pages (project site)

1. Push this repo to GitHub (e.g. `alutterb/chinese-stroop`).
2. **Settings → Pages → Build and deployment:** set **Source** to **GitHub Actions** (not “Deploy from a branch”) so [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) can publish the site with `api-config.js` injected from secrets.
3. **Settings → Secrets and variables → Actions:** add repository secret **`STROOP_API_CONFIG`** = full contents of your local `api-config.js` (same as `window.STROOP_API = { ... };` block).
4. Push to **`main`** (or run the workflow manually). The job writes `api-config.js` on the runner, copies static assets into `_site`, and deploys.
5. If GitHub asks to approve the **`github-pages`** environment the first time, approve it.
6. App URL: `https://<user>.github.io/<repo>/` (e.g. `https://alutterb.github.io/chinese-stroop/`).

Assets use relative paths (`./styles.css`, `./app.js`) so no `base` tag is required.

**Previously used “Deploy from branch” on `/`?** Switch to **GitHub Actions** as above; otherwise `api-config.js` never gets created on Pages and the leaderboard stays local-only.

## Cross-device leaderboard (Supabase)

Without configuration, scores are saved only in **this browser** (`localStorage` via `ChineseStroopLocal`). To share a leaderboard across devices:

1. Create a [Supabase](https://supabase.com) project.
2. In **SQL Editor**, run [`docs/supabase-stroop-scores.sql`](docs/supabase-stroop-scores.sql) (creates `stroop_scores`, index, RLS for `anon` insert + select).
3. **Project Settings → API:** copy **Project URL** and the **public** client key (legacy **anon** JWT or newer **publishable** key — either works in `api-config.js` for PostgREST).
4. Copy [`api-config.example.js`](api-config.example.js) to **`api-config.js`** (this file is **gitignored** — do not commit secrets).
5. Set `supabaseUrl` and `supabaseAnonKey` in `api-config.js`.

**Supabase “Connect” shows Next.js + `npm install @supabase/supabase-js`?** You can ignore that for this repo: there is no Node server. The game uses plain `fetch` in [`leaderboard-api.js`](leaderboard-api.js); only `api-config.js` is needed.

`index.html` and `leaderboard.html` load `./api-config.js` first. If that file is missing or empty (404 / failed deploy), the app falls back to local-only storage.

**Security note:** The anon key is public in the browser; RLS + `CHECK` constraints limit what can be stored. Anyone can still post junk rows (rate limits / moderation are a possible follow-up).

## Leaderboard page

- Open [`leaderboard.html`](leaderboard.html) or use **Leaderboard** in the nav.
- **Refresh** reloads from Supabase (or local fallback if the API is unavailable / not configured).
- Each run submits **name**, **level**, **accuracy %**, and **total run time** (wall clock for the 24-trial session).

## Game rules (timing)

- **15 seconds per trial**: if no answer, the trial counts as wrong and the correct option is shown.
- Optional **display name** on the home screen is used for leaderboard entries (defaults to “Anonymous”).

## Local preview

From the repo root:

```bash
python3 -m http.server 8080
```

Visit `http://127.0.0.1:8080/`. Optionally add `api-config.js` locally to test Supabase.
