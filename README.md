# BlockForge X (Desktop + GitHub Pages)

A glossy, advanced Roblox-style platform prototype with:

- account login/register
- social feed and friend requests
- virtual currency (BUX), transfers, and creator rewards
- marketplace purchases with inventory ownership
- world discovery + publishing
- global chat
- **multiplayer room presence** (shared state)
- **GitHub Pages mode** using your GitHub repo JSON as backend storage

## Run locally

```bash
npm start
```

Open `http://localhost:3000`.

## Deploy as website on GitHub Pages

1. Push this repo to GitHub.
2. In GitHub: **Settings → Pages**.
3. Set source to your branch (`main`) and root (`/`).
4. Open your Pages URL (`https://<owner>.github.io/<repo>/`).
5. In app sidebar, set:
   - Mode: `GitHub Pages Mode`
   - GitHub owner/repo/branch
   - Optional token for write operations (needed for creating/updating data)
6. Save config and reload.

## Data

Primary data file: `data/db.json` (users, worlds, posts, marketplace, chat, presence).
