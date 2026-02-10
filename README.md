# BlockForge X (Desktop)

A glossy, advanced Roblox-style desktop platform prototype with:

- account login/register (username based)
- social feed and friend requests
- virtual currency (BUX) with transfers and creator rewards
- marketplace purchases with inventory ownership
- world discovery and world publishing
- global chat room

## Run

```bash
npm start
```

Then open `http://localhost:3000`.

## Data Model

All platform state is persisted in `data/db.json`:
- users, worlds, posts, friend requests
- marketplace and transactions
- chat messages
