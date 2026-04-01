# Chinese Stroop

Static Stroop task: English color word with colored ink, choose the correct **simplified Chinese** label. Three levels (congruent; incongruent + pinyin; incongruent only). Stats are stored in `localStorage` under the `chineseStroop_` prefix.

## GitHub Pages (project site)

1. Push this repo to GitHub (e.g. `alutterb/chinese-stroop`).
2. **Settings → Pages → Build and deployment:** Source **Deploy from a branch**, branch **main**, folder **/ (root)**.
3. App URL: `https://<user>.github.io/<repo>/` (e.g. `https://alutterb.github.io/chinese-stroop/`).

Assets use relative paths (`./styles.css`, `./app.js`) so no `base` tag is required.

## Leaderboard

- Open [`leaderboard.html`](leaderboard.html) (or use the **Leaderboard** link on the home page).
- Each completed run is saved with **display name**, **accuracy**, and **total run time** (wall clock for all 24 trials, including feedback gaps), under the level you played.
- Data lives in **`localStorage` only** (`chineseStroop_leaderboard`) on that browser — it is not synced between devices or students. For a class-wide board you would need a small backend or hosted API.

## Game rules (timing)

- **15 seconds per trial**: if no answer, the trial counts as wrong and the correct option is shown.
- Optional **display name** on the home screen is used for leaderboard entries (defaults to “Anonymous”).

## Local preview

Open `index.html` in a browser, or from the repo root:

```bash
python3 -m http.server 8080
```

Then visit `http://127.0.0.1:8080/`.
