# Chinese Stroop

Static Stroop task: English color word with colored ink, choose the correct **simplified Chinese** label. Three levels (congruent; incongruent + pinyin; incongruent only). Stats are stored in `localStorage` under the `chineseStroop_` prefix.

## GitHub Pages (project site)

1. Push this repo to GitHub (e.g. `alutterb/chinese-stroop`).
2. **Settings → Pages → Build and deployment:** Source **Deploy from a branch**, branch **main**, folder **/ (root)**.
3. App URL: `https://<user>.github.io/<repo>/` (e.g. `https://alutterb.github.io/chinese-stroop/`).

Assets use relative paths (`./styles.css`, `./app.js`) so no `base` tag is required.

## Local preview

Open `index.html` in a browser, or from the repo root:

```bash
python3 -m http.server 8080
```

Then visit `http://127.0.0.1:8080/`.
