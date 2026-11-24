# Find Your Tribe 🏝️

**One QR. Five Questions. Your Tribe. Real Conversations.**

A mobile web experience that turns a room of strangers into small interest-matched groups with a fun in-person challenge.
See [prd.md](prd.md) for the product spec and [IMPLEMENTATION.md](IMPLEMENTATION.md) for the technical plan.

> Built by Parth Makwana for the goSTOPS Build Sprint. Not an official goSTOPS product.

## Stack
MongoDB · Express · React (Vite + Tailwind) · Node.js · Socket.IO. It is a single service: Express serves the API, the WebSocket and the built React app.

## Run locally
```bash
npm install          # server deps
npm run build        # installs client deps + builds client/dist
npm start            # http://localhost:4000
```
No database setup is needed locally. Without `MONGO_URI`, the server starts a throwaway in-memory MongoDB, and its data resets on restart.

Hot-reload dev mode: `npm install --prefix client`, then `npm run dev`. The client runs on :5173 and proxies to the API on :4000. Phones on the same Wi-Fi can open `http://<your-PC-IP>:5173`.

## Tests
```bash
npm test                        # grouping engine unit tests
node scripts/smoke.mjs          # full API journey against a running server (uses a test room)
```

## Routes
| URL | Who |
|---|---|
| `/` | Create a room / join with a code |
| `/host/:code` | Host screen: QR, live counts, "Form the tribes", teams |
| `/r/:code` | Participant journey (QR target): join → 5 questions → wait → reveal → challenge → summary → feedback |
| `/stats` | Real-usage results dashboard |
| `/?test=1` | Create a **test room** that's excluded from `/stats` (use while rehearsing) |

## Deploy (Render + MongoDB Atlas)
1. **Atlas:** create a free M0 cluster → Database Access: add a user → Network Access: allow `0.0.0.0/0` → copy the connection string.
2. Push this repo to GitHub.
3. **Render:** New → Blueprint → pick the repo (uses `render.yaml`), or New → Web Service with:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Env vars: `NODE_ENV=production`, `MONGO_URI=<atlas string>`
4. Open `https://<app>.onrender.com`, create a room, and scan the QR code.

⚠️ The free Render plan sleeps after 15 minutes idle, and the first load then takes about 30–60 s. Open the site a minute before each session.
