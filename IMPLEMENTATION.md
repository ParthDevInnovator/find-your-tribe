# Find Your Tribe — Implementation Plan (MERN)

**Stack:** MongoDB · Express · React · Node.js, plus Socket.IO for real-time updates
**Deadline:** Wed Nov 25, 2026, 10:00 PM (≈ 2.5 days from Nov 23 evening)
**Source of truth:** [prd.md](prd.md)

---

## 1. Architecture

```
 Phones (participants)        Host phone/laptop
        │  HTTPS + WebSocket          │
        ▼                             ▼
 ┌──────────────────────────────────────────────┐
 │  Node.js + Express  (single service, Render) │
 │   • REST API  /api/*                         │
 │   • Socket.IO  (room channels)               │
 │   • Serves React build (client/dist)         │
 │   • Grouping engine (pure JS module)         │
 └──────────────────────┬───────────────────────┘
                        │ Mongoose
                        ▼
              MongoDB Atlas (free M0)
```

**Key decision: one deployable service.** Express serves the built React app *and* the API/socket on the same origin.
- One public URL, so the QR code is simple
- No CORS issues and no cross-origin cookie problems
- One deploy instead of two

**Real-time:** Socket.IO rooms keyed by room code. The server is authoritative: clients send actions over REST, the server writes to Mongo and then broadcasts the new state to the room. Sockets carry only broadcasts. This keeps reconnect logic simple: on reconnect, the client re-fetches state over REST.

**Identity without login:** on join, the server returns `participantId` + `participantToken`. The client stores them in `localStorage` keyed by room code, so a page refresh or a phone lock resumes the session. A `deviceId` (random UUID kept in `localStorage`) is used to estimate **unique participants**.

**Host auth:** creating a room returns a `hostToken` (stored in `localStorage`). Host-only actions (start grouping, end room) require it.

---

## 2. Tech Choices

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast dev and a tiny build |
| Styling | Tailwind CSS | Fast, mobile-first, easy team colors |
| Routing | react-router-dom | Pages per step |
| Animation | framer-motion (reveal screens only) | Exciting reveals with little code |
| QR | `qrcode.react` | Renders QR client-side |
| Real-time | `socket.io` / `socket.io-client` | Rooms, auto-reconnect, fallbacks |
| Backend | Express 4, Mongoose 8 | Standard MERN |
| IDs | `nanoid` (custom alphabet) | Short room codes, e.g. `TRB4K9` |
| Validation | `zod` | Validate request bodies |
| DB | MongoDB Atlas M0 | Free, hosted |
| Hosting | Render Web Service (free/starter) | Supports WebSockets; Vercel serverless does not |

> ⚠️ The Render free tier sleeps after 15 min idle (cold start ≈ 30–60 s). Open the URL a minute before each test session, or use the $7 starter plan during the sprint.

---

## 3. Folder Structure

```
Match/
├── prd.md
├── IMPLEMENTATION.md
├── package.json              # root scripts: dev, build, start
├── server/
│   ├── index.js              # express + socket.io bootstrap, serves client/dist
│   ├── config.js             # env (MONGO_URI, PORT, ADMIN_KEY, CLIENT_URL)
│   ├── db.js
│   ├── models/
│   │   ├── Room.js
│   │   ├── Participant.js
│   │   ├── Team.js
│   │   └── Event.js          # analytics event log
│   ├── routes/
│   │   ├── rooms.js
│   │   ├── participants.js
│   │   ├── teams.js
│   │   └── stats.js
│   ├── middleware/
│   │   ├── hostAuth.js
│   │   └── participantAuth.js
│   ├── socket.js             # io instance + emitRoomState(roomCode)
│   ├── grouping/
│   │   ├── groupSizes.js
│   │   ├── groupParticipants.js
│   │   ├── teamIdentity.js   # name, emoji, color, "what connects you"
│   │   └── __tests__/grouping.test.js
│   └── data/
│       ├── questions.js      # 5 questions + option tags
│       ├── challenges.js     # 10 challenges + interest tags
│       └── avatars.js
└── client/
    ├── index.html
    ├── vite.config.js        # dev proxy /api and /socket.io → :4000
    └── src/
        ├── main.jsx, App.jsx (routes)
        ├── api.js            # fetch wrapper adds tokens
        ├── socket.js         # useRoomSocket(roomCode) hook
        ├── storage.js        # localStorage helpers (try/catch)
        ├── data/questions.js # shared copy (or import from /shared)
        ├── components/       # Button, AvatarPicker, OptionCard, ProgressDots,
        │                     # TeamCard, Footer (mandatory attribution)
        └── pages/
            ├── Home.jsx           # "Create a room" / "Join with code"
            ├── HostRoom.jsx       # QR, live counts, Start, teams view
            ├── Join.jsx           # nickname + avatar
            ├── Questions.jsx      # 5 questions, one per screen
            ├── Waiting.jsx
            ├── Reveal.jsx         # tribe reveal + "find your teammates"
            ├── Challenge.jsx
            ├── Summary.jsx        # final tribe reveal + conversation starter
            ├── Feedback.jsx
            ├── Done.jsx
            └── Stats.jsx          # results dashboard
```

Option: put `questions.js`, `challenges.js` and `avatars.js` in a `/shared` folder that both sides import, so the data never drifts apart.

---

## 4. Data Models (Mongoose)

```js
// Room
{
  code: String,            // unique, 6 chars, indexed
  hostTokenHash: String,
  status: 'lobby' | 'grouped' | 'ended',
  createdAt: Date,
  startedAt: Date,
}

// Participant
{
  roomCode: String,        // indexed
  tokenHash: String,
  deviceId: String,        // for unique-participant estimate
  nickname: String,        // 1–20 chars, trimmed
  avatar: String,          // emoji id
  answers: [Number],       // length 5, each 0–3; empty until submitted
  status: 'joined' | 'answered' | 'grouped'
        | 'challenge_started' | 'challenge_done' | 'feedback_done',
  teamId: ObjectId | null,
  feedback: { talkedToNew: Boolean, wouldRepeat: 'yes'|'maybe'|'no' },
  createdAt: Date,
}

// Team
{
  roomCode: String,
  name: String,            // "Sunset Squad"
  emoji: String,           // "🏖️"
  color: String,           // "#FF8A5B"
  connection: String,      // "You all love spontaneous adventures…"
  starter: String,         // conversation starter
  challengeId: Number,
  memberIds: [ObjectId],
  challengeStartedAt: Date,
  challengeCompletedAt: Date,
}

// Event (append-only analytics log)
{ type: String, roomCode: String, participantId, teamId, at: Date }
// types: room_created, joined, answered, teams_formed,
//        challenge_started, challenge_completed, feedback_submitted
```

Tokens are stored hashed (sha256). The raw token exists only on the client.

---

## 5. REST API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/rooms` | – | Create a room → `{ code, hostToken }` |
| GET | `/api/rooms/:code` | – | Public room info `{ code, status, joined, answered }` |
| GET | `/api/rooms/:code/host` | host | Full host view: counts plus teams once grouped |
| POST | `/api/rooms/:code/start` | host | Run grouping → create teams → broadcast |
| POST | `/api/rooms/:code/join` | – | `{ nickname, avatar, deviceId }` → `{ participantId, participantToken }` |
| GET | `/api/me` | participant | Own state: status, answers, team (with members) |
| POST | `/api/me/answers` | participant | `{ answers: [0-3 ×5] }` |
| POST | `/api/me/challenge/start` | participant | Marks challenge started (team-level timestamp) |
| POST | `/api/me/challenge/complete` | participant | Marks team challenge complete |
| POST | `/api/me/feedback` | participant | `{ talkedToNew, wouldRepeat }` |
| GET | `/api/stats` | `?key=ADMIN_KEY` (optional) | Aggregate dashboard numbers |

**Rules enforced server-side**
- You can't join a room that has already been grouped. Show "This tribe has already formed — ask the host to create a new room." *(Optional stretch: allow late joiners to be added to the smallest team.)*
- The host can start once at least 2 participants have `answered`. Participants who joined but never answered are excluded from grouping and see a "the game has started" screen.
- `start` is idempotent: if the room is already `grouped`, it returns the existing teams.

---

## 6. Socket.IO Events

The client joins channel `room:<CODE>` on connect (`socket.emit('room:join', code)`).

| Event (server → client) | Payload | Who reacts |
|---|---|---|
| `room:counts` | `{ joined, answered, completed }` | Host screen, Waiting room |
| `room:grouped` | `{ status: 'grouped' }` | Waiting room → fetches `/api/me` → Reveal |
| `team:challenge` | `{ teamId, startedAt, completedAt }` | Teammates' Challenge screens stay in sync |

The server emits `room:counts` after every join, answer, completion or feedback. Clients never trust socket payloads for their own identity. They re-fetch `/api/me`.

---

## 7. Grouping Engine (the core logic)

### 7.1 Group sizes (matches the PRD table)
```js
function groupSizes(n) {
  if (n <= 5) return [n];                 // 2–5 → one group
  const k = Math.ceil(n / 4);             // number of groups
  const base = Math.floor(n / k), extra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
}
// 6→[3,3] 7→[4,3] 8→[4,4] 9→[3,3,3] 10→[4,3,3] 11→[4,4,3] 12→[4,4,4] 13→[4,3,3,3]
```
This never produces a group of 1 or 2 when n ≥ 6, so nobody is left alone.

### 7.2 Similarity
Each participant = 5 answers. Similarity between two people = weighted count of matching answers:
```
weights = [2, 1.5, 1.5, 1, 1]   // Q1 (destination) drives the team theme most
sim(a, b) = Σ weights[q] * (a[q] === b[q])
```

### 7.3 Algorithm (greedy seed + fill + swap polish)
1. **Seed:** choose `k` seeds by farthest-point. The first seed is the person with the most common Q1 answer. Each next seed is the person least similar to the existing seeds. This gives diverse team "themes".
2. **Fill:** order the remaining people by how strongly they prefer their best seed (best minus second-best score). Assign each to the most similar team that still has capacity under its target size. Using capacity guarantees balance and inclusion: anyone without a close match goes to the best team with room.
3. **Polish:** for up to ~200 iterations, try swapping two people between teams. Keep the swap if total within-team similarity rises. Sizes don't change, so balance holds.
4. Deterministic and fast (n ≤ 50 → milliseconds). No ML needed. The PRD asks for comfortable groups, not perfect matching.

### 7.4 Team identity (`teamIdentity.js`)
- **Theme** = the team's most common Q1 answer (ties → Q4):
  - Beach → 🏖️ Sunset Squad · Mountain → 🏔️ Mountain Explorers · City → 🏙️ City Hoppers · Wild → 🌲 Wild Trailblazers
  - If two teams share a theme, the next team uses a name from the team's top Q3 answer, e.g. 🍕 Food Hunters, 🎲 Game Night Crew, ☕ Deep Talkers, 🌆 Night Wanderers.
- **Color** from a fixed palette of 8 high-contrast colors, unique per room.
- **"What connects you"** is built from the 2–3 answers most members share, using templates:
  `"You all love {Q1 phrase}, {Q3 phrase}, and {Q5 phrase}!"`
  If nothing is shared, fall back to: *"You're a mix of planners and free spirits — the best trips need both!"*
- **Challenge** chosen by tag match. Each challenge in `challenges.js` has tags (`food`, `games`, `adventure`, `social`, `deep`, `planning`, `funny`). Score each against the team's answers and pick the top one, using a random tie-break among the top 3 for variety. Avoid giving two teams in a room the same challenge.
- **Conversation starter** picked from a small pool by theme.

### 7.5 Tests
Use Jest or `node:test` on `groupSizes` for n = 2…30, and on `groupParticipants`:
- Every participant is assigned exactly once.
- Sizes match `groupSizes(n)`.
- Identical answer sets end up together.

---

## 8. Frontend Flow & Routes

| Route | Screen | Advances when |
|---|---|---|
| `/` | Home: **Host a room** / Join by code | – |
| `/host/:code` | QR + join link, live joined/answered counts, **Start** button (enabled at ≥ 2 answered), then teams list and completed count | Host taps Start |
| `/r/:code` | **QR target.** Join: nickname + avatar grid | Join submitted |
| `/r/:code/q` | 5 questions, one per screen, big emoji cards, auto-advance on tap, progress dots, back button | 5th answer submitted |
| `/r/:code/wait` | "8 explorers have joined! 6 ready…" with a playful animation | `room:grouped` socket event |
| `/r/:code/tribe` | **Reveal:** team color fills the screen, emoji + name animate in, teammates' avatars, connection line, "Find your teammates and say hello!" → button "We found each other!" | Tap → challenge start |
| `/r/:code/challenge` | Challenge card (title, 2–3 lines, optional 3-min timer) → "We did it!" | Tap → complete (synced to the whole team) |
| `/r/:code/summary` | 🎉 You Found Your Tribe + teammates + connection + conversation starter | Tap → feedback |
| `/r/:code/feedback` | 2 questions, big buttons | Submit |
| `/r/:code/done` | "🎉 Your tribe is waiting! Put your phone away…" | – |
| `/stats` | Results dashboard | – |

**Resume logic:** every `/r/:code/*` page calls `/api/me` on load and redirects to the page that matches the participant's `status`. Refreshing or reopening the link always lands in the right place.

**Footer on every page:** *"Built by Parth Makwana for the goSTOPS Build Sprint. Not an official goSTOPS product."*

**UX details**
- Large tap targets (≥ 48 px) and one action per screen
- Reveal moment: framer-motion scale/fade, plus confetti built with CSS only, no library
- Keep the bundle small (< 200 KB gzipped) for fast opening over hostel Wi-Fi

---

## 9. Results Dashboard (`/stats`)

Computed with Mongo aggregations, so it reflects **real data only**:

| Metric | Query |
|---|---|
| Total rooms created | `Room.countDocuments()` |
| Estimated unique participants | `Participant.distinct('deviceId').length` |
| Completed questions | `Participant.countDocuments({ answers: { $size: 5 } })` |
| Teams formed | `Team.countDocuments()` |
| Participants who started challenges | members of teams with `challengeStartedAt` |
| Reported challenge completions | `Team.countDocuments({ challengeCompletedAt: { $ne: null } })` + participant count |
| Feedback submitted | `Participant.countDocuments({ 'feedback.talkedToNew': { $exists: true } })` |
| Talked to someone new | `{ 'feedback.talkedToNew': true }` (+ % of feedback) |
| Would repeat (yes/maybe/no) | group-by |

Add a filter to exclude test rooms, e.g. a `isTest` flag on rooms created while you build. Mark them with `?test=1` at creation, or delete them before the real sessions. This keeps the submission numbers honest.

---

## 10. Implementation Phases

Time estimates assume one developer working focused. Each phase ends in something that works and can be demoed.

### Phase 0 — Setup (Nov 23 evening, ~1 h)
- [ ] `git init` (no `.git` in this folder yet); add `.gitignore` (node_modules, .env, dist)
- [ ] Root `package.json` with scripts: `dev` (concurrently server + vite), `build` (vite build), `start` (node server)
- [ ] Scaffold `client/` with Vite React + Tailwind; scaffold `server/` with Express, Mongoose, Socket.IO
- [ ] MongoDB Atlas M0 cluster, `MONGO_URI` in `.env`; allow access from 0.0.0.0/0
- [ ] Health route `/api/health`; Vite proxy for `/api` and `/socket.io`
- **Done when:** `npm run dev` shows the React page, which calls `/api/health` and gets an OK response.

### Phase 1 — Backend core: rooms & participants (Nov 23 night, ~2–3 h)
- [ ] Models: Room, Participant, Team, Event
- [ ] `questions.js`, `avatars.js`, `challenges.js` data files (10 challenges with tags)
- [ ] Routes: create room, get room, join, `/me`, submit answers
- [ ] Host and participant token middleware
- [ ] Socket.IO: `room:join` and an `emitRoomCounts(code)` helper, called after join/answer
- **Done when:** with curl or Postman you can create a room, join 3 participants and submit answers, and the counts update.

### Phase 2 — Grouping engine (Nov 24 morning, ~2 h)
- [ ] `groupSizes`, `groupParticipants`, `teamIdentity`, challenge picker
- [ ] Unit tests (sizes for n = 2–30, inclusion, identical answers together)
- [ ] `POST /rooms/:code/start` → creates Teams, sets participants to `grouped`, emits `room:grouped`
- **Done when:** tests pass, and starting a seeded room of 10 fake participants returns teams of 4/3/3 with names and challenges.

### Phase 3 — Participant flow UI (Nov 24 midday, ~4 h)
- [ ] Join page (nickname + avatar grid)
- [ ] Questions (one per screen, auto-advance)
- [ ] Waiting room with live counts via socket
- [ ] Reveal screen with animation
- [ ] Resume and redirect logic based on `status`
- [ ] Footer attribution component
- **Done when:** three browser windows can join, answer, wait, and all switch to Reveal when the room is started from curl.

### Phase 4 — Host experience (Nov 24 afternoon, ~2 h)
- [ ] Home "Host a room" → `/host/:code`
- [ ] QR code of `https://<domain>/r/<CODE>` + code shown in large text + copy-link button
- [ ] Live joined/answered counts; Start button; teams grid after start; completed count
- **Done when:** the full loop works from the host screen with no curl.

### Phase 5 — Challenge, summary, feedback (Nov 24 evening, ~2–3 h)
- [ ] Challenge screen ("We found each other" → start; "We did it!" → complete), synced across teammates with `team:challenge`
- [ ] Summary screen (connection + conversation starter)
- [ ] Feedback form → Done screen
- [ ] Event logging for every analytics event
- **Done when:** a participant can go from join to done end-to-end.

### Phase 6 — Dashboard + deploy (Nov 24 night, ~2 h)
- [ ] `/api/stats` aggregations + `/stats` page (big stat tiles)
- [ ] Express serves `client/dist` with an SPA fallback (`app.get('*')` → index.html, after the API routes)
- [ ] Deploy to Render: build command `npm install && npm run build`, start command `npm start`, set env vars
- [ ] Phone test over 4G/Wi-Fi: QR scan → full flow
- [ ] Clear test data (or flag it `isTest`)
- **Done when:** the public URL works on 3 real phones.

### Phase 7 — Polish & hardening (Nov 25 morning, ~2–3 h)
- [ ] Visual polish: team colors, confetti, transitions, emoji sizing, dark-room readability
- [ ] Edge cases: duplicate nicknames (allow, but append avatar), 2–3 players, socket disconnect → re-fetch, a participant who never answers
- [ ] Rate-limit join/create (`express-rate-limit`), input length limits
- [ ] Lighthouse check on mobile (aim for a performance score of 90+)
- **Done when:** a 5-device dry run has no confusion and no errors.

### Phase 8 — Real-world testing (Nov 24 evening → Nov 25 afternoon)
- [ ] 3–4 sessions with 6–10 people each (hostel, PG, canteen, café) → target ~30 participants
- [ ] Wake the Render service before each session
- [ ] Take photos/clips for the Loom (with consent) and note what confused people
- [ ] Quick fixes between sessions
- **Done when:** the dashboard shows real numbers from ~30 participants.

### Phase 9 — Submission (Nov 25, 6–10 PM)
- [ ] Record the 3-minute Loom: problem → solution → live demo → real testing footage → dashboard numbers
- [ ] Half-page write-up: thinking, why interest-based grouping, how it was tested, actual participant count, feedback & lessons
- [ ] Final check: public link works, attribution visible, stats are real only
- [ ] Submit before **10:00 PM**

---

## 11. Priorities if time runs short

**Must have (MVP):** create room + QR, join, 5 questions, waiting room, auto-grouping, reveal, challenge + complete, feedback, stats, attribution, deploy.
**Should have:** interest-matched challenges, a "connection" line per team, resume after refresh, synced challenge state.
**Nice to have:** animations/confetti, a challenge timer, late joiners added to the smallest team, a host "end room" button.

---

## 12. Environment Variables

```
MONGO_URI=mongodb+srv://...
PORT=4000
ADMIN_KEY=<random string, optional, for /stats>
NODE_ENV=production
```

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Render cold start during a live session | Wake the service 2 min before, or use the paid starter for the sprint |
| Hostel Wi-Fi blocks WebSockets | Socket.IO falls back to long-polling automatically |
| Phone locks/refreshes mid-game | `localStorage` tokens + `/api/me` resume |
| Someone never finishes questions | Host can start with ≥ 2 answered; stragglers see a "game started" screen |
| Test data inflates results | `isTest` flag / wipe before real sessions; dashboard filters it out |
| Running out of time | Follow the MVP list in §11; drop the nice-to-haves first |
