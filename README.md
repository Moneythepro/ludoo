# Ludo PWA (Offline, Pass‑and‑Play)

A lightweight Ludo game for 2–6 players that runs entirely in the browser and works offline. Perfect for GitHub Pages.

## Features
- ✅ 2–6 players (select in UI)
- ✅ 1–4 tokens per player
- ✅ Pass‑and‑play (one device)
- ✅ PWA: installable + offline via service worker
- ✅ Captures, safe cells, exact finish, extra turn on 6, three‑six rule

## Deploy to GitHub Pages
1. Create a repo and upload these files (keep the folder structure).
2. In **Settings → Pages**, choose the `main` branch and root (`/`) folder.
3. Wait for Pages to build; open the URL it shows.
4. On Android/desktop, click **Install** or **Add to Home Screen**.

## Local run
Just open `index.html` (or use any static server).

## Notes
- The board is a stylized circular layout to keep the code compact.
- Rules are close to Ludo King but simplified a bit. Tweak in `app.js` if you want stricter behavior.