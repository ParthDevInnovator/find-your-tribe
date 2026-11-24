# Find Your Tribe — Knowledge Base

_As of 2026-11-23 · Parth Makwana_

Everything about the project in one place: product, rules, architecture, code, API, grouping logic, dashboard, how to run/deploy, status, risks and submission.
Related files: [prd.md](prd.md) (spec) · [IMPLEMENTATION.md](IMPLEMENTATION.md) (technical plan) · [README.md](README.md) (run & deploy).

---

## 1. Overview

Find Your Tribe is a mobile web app that turns a room of strangers into small groups of 3–4 people with shared interests, then gives each group a short in-person challenge. **Development is complete and tested locally.** What remains is deployment, real-world testing with about 30 people, and the sprint submission.

- **Tagline:** One QR. Five Questions. Your Tribe. Real Conversations.
- **Problem:** People in a hostel common room want to meet each other, but nobody starts the first conversation, so everyone scrolls their phone instead.
- **Core principle:** The phone brings people together; the real experience happens offline. The whole journey takes 5–8 minutes.

| Item | Detail |
|---|---|
| Built for | goSTOPS Build Sprint |
| Deadline | Wednesday, November 25, 2026, 10:00 PM |
| Submission | Public working link, 3-minute Loom video, half-page explanation |
| Validation goal | About 30 real participants across 3–4 small groups |
| Mandatory attribution | "Built by Parth Makwana for the goSTOPS Build Sprint. Not an official goSTOPS product." |
| Project folder | `C:\Users\PARTH\Match` |

---

## 2. User journey

People scan, answer five questions and wait. The host's single tap forms the teams and moves every phone to the reveal at once.

```
HOST
 [Create a room] ──► [Show QR code] ──(when 2+ are ready)──► [Form the tribes]
                          │ scan                                     │ releases all
                          ▼                                          ▼
EVERY PARTICIPANT
 [Scan QR code] ──► [Nickname + avatar] ──► [Answer 5 questions] ──► [Waiting room]
                                                                          │
                                                                          ▼
 [Final summary] ◄── [Team challenge] ◄── [Find teammates] ◄──── ★[Tribe reveal]★
       │               (in person, ~3 min)
       ▼
 [Feedback] ──► [Phones away]                 Whole journey: 5–8 minutes
```

- The host never manages teams by hand.
- Anyone who scans after the tribes are formed answers the questions and is added to the best-fitting smaller team.
- Each participant's step is stored on the server, so a refresh or a locked phone resumes in the same place.

### Screens

| Screen | What happens |
|---|---|
| Home `/` | Create a room, or join with a code |
| Host `/host/:code` | QR + room code, live joined/answered counts, player list, **Form the tribes** button, then team cards with challenge progress |
| Join `/r/:code` | Nickname + avatar (no signup) |
| Questions | 5 questions, one per screen, big emoji cards, auto-advance, back button |
| Waiting room | "8 explorers have joined!" + how many still answering |
| Tribe reveal | Full-screen team color, confetti, team name, teammates, "what connects you", mission: find your teammates |
| Challenge | Challenge card + 3-minute timer; "We did it!" (one tap marks the whole team done) |
| Final summary | Team, teammates, what connects you, conversation starter |
| Feedback | 2 questions |
| Done | "Your tribe is waiting! Put your phone away and keep the conversation going." |
| Results `/stats` | Real-usage dashboard |

---

## 3. Product rules

Every participant answers five multiple-choice questions, is placed in a balanced team, and does one challenge. No points or leaderboards.

### The five questions

| # | Question | Options |
|---|---|---|
| 1 | Your dream trip starts tomorrow. Where are you going? | Beach escape, Mountain adventure, City exploration, Into the wild |
| 2 | What's your travel personality? | The planner, Go with the flow, The social butterfly, The curious explorer |
| 3 | You have one free evening. What sounds best? | Playing games, Exploring food, Exploring the city, Deep conversations |
| 4 | What kind of experience excites you most? | Something funny and unexpected, An adventurous experience, Meeting interesting people, Discovering beautiful places |
| 5 | What makes a trip unforgettable? | The people, The places, The food, The experiences |

### Grouping rules

- Groups of about 3–4; similar answers grouped together.
- Everyone is included and nobody is left alone; groups stay balanced.
- Without an exact match, a person goes to the most suitable group with room.
- Must work for small and large rooms.

| Participants | Group sizes |
|---|---|
| 2–5 | One group |
| 6 | 3 + 3 |
| 7 | 4 + 3 |
| 8 | 4 + 4 |
| 9 | 3 + 3 + 3 |
| 10 | 4 + 3 + 3 |
| 11 | 4 + 4 + 3 |
| 12 | 4 + 4 + 4 |

### The ten challenges

Each team gets one 2–3 minute challenge matched to its interests. No two teams in a room get the same one.

| # | Challenge | What the team does | Matched to |
|---|---|---|---|
| 1 | The ₹5,000 Adventure | Plan a 48-hour trip on ₹5,000; everyone adds one idea | planning, adventure, food |
| 2 | Two Truths and One Lie | Each shares two truths and a lie; others guess the lie | funny, social, games |
| 3 | Find Three Things in Common | Find three surprising shared things, not from the quiz | deep, people, curious |
| 4 | The Travel Disaster | One person mimes a travel disaster; others guess | funny, games, experiences |
| 5 | Mystery Destination | Describe a place without naming it; others guess | places, games, destinations |
| 6 | Build Your Dream Hostel | Each suggests one crazy hostel feature | funny, social, experiences |
| 7 | Story Chain | Build a travel story one sentence and twist at a time | funny, deep, games |
| 8 | The Food Challenge | Share the strangest food eaten; pick the best story | food, city, experiences |
| 9 | Desert Island | Agree on three objects to bring and why | wild, beach, adventure, deep |
| 10 | Plan Tomorrow Together | Build a one-day city itinerary covering everyone | planning, city, food, places |

### Feedback

- Did this experience help you talk to someone new? **Yes / No**
- Would you enjoy another activity with your teammates? **Yes / Maybe / No**

After submitting: "🎉 Your tribe is waiting! Put your phone away and keep the conversation going."

### Not building

User accounts or login, social profiles, friend requests, in-app messaging, voice or video calls, AI chatbots, complex gamification, leaderboards, multiple rounds, mandatory profile photos, payments.

---

## 4. Architecture and tech stack

One Node.js service serves the React pages, the REST API and live updates from a single URL, backed by MongoDB.

```
   ┌──────────────────────────┐        ┌──────────────────────────────┐
   │ Participant phones       │        │ Host screen                  │
   │ browser only, no login   │        │ QR, live counts, Start tap   │
   └────────────┬─────────────┘        └───────────────┬──────────────┘
                │      HTTPS requests + WebSocket updates     │
   ┌────────────▼───────────────────────────────────────────▼──────────┐
   │ Node.js + Express service on Render (one URL)                     │
   │ ┌──────────────┐ ┌──────────────┐ ┌───────────────┐ ┌───────────┐ │
   │ │ REST API     │ │ Socket.IO    │ │ Grouping      │ │ Built     │ │
   │ │ rooms, join, │ │ channel per  │ │ engine        │ │ React app │ │
   │ │ answers,     │ │ room; counts,│ │ balanced 3–4, │ │ client/   │ │
   │ │ challenge,   │ │ status, team │ │ similar       │ │ dist, same│ │
   │ │ feedback,    │ │ updates      │ │ answers,      │ │ URL, no   │ │
   │ │ stats        │ │              │ │ names         │ │ CORS      │ │
   │ └──────────────┘ └──────────────┘ └───────────────┘ └───────────┘ │
   └─────────────────────────────┬─────────────────────────────────────┘
                                 │ Mongoose
                  ┌──────────────▼──────────────┐
                  │ MongoDB Atlas (free M0)     │
                  │ rooms, participants, teams  │
                  └─────────────────────────────┘
```

- The server is the single source of truth. Phones send actions over REST; the server saves them, then broadcasts to the room.
- Vercel is not used because its serverless functions can't hold WebSocket connections.

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite 6, Tailwind CSS 4, React Router 6, qrcode.react |
| Live updates | Socket.IO 4, with automatic fallback to long-polling |
| Backend | Node.js, Express 4, Mongoose 8, express-rate-limit, dotenv |
| Database | MongoDB Atlas (production); in-memory MongoDB (development) |
| Hosting | Render web service |
| Identity | No login: random tokens kept in the browser; host token for host actions; device ID for unique-participant counts |

---

## 5. Codebase map

| Path | What it holds |
|---|---|
| `shared/gameData.js` | Questions with option tags, team names and phrases; avatars; team colors; 10 challenges; conversation starters; attribution text |
| `server/index.js` | Express app, rate limit, serves `client/dist`, Socket.IO setup, error handler |
| `server/db.js` | MongoDB connection; in-memory MongoDB fallback in development |
| `server/models.js` | Room, Participant, Team schemas |
| `server/routes.js` | All REST endpoints, host and participant token checks, late-joiner placement, stats |
| `server/realtime.js` | Live room counts and socket broadcasts |
| `server/grouping.js` | Group sizes, similarity, grouping algorithm, late-joiner team pick |
| `server/identity.js` | Team name, emoji, color, connection line, challenge pick, starter |
| `server/grouping.test.js` | 6 unit tests for the grouping engine |
| `client/src/App.jsx` | Routes: `/`, `/host/:code`, `/r/:code`, `/stats` |
| `client/src/pages/Home.jsx` | Create a room or join with a code |
| `client/src/pages/Host.jsx` | QR, live counts, player list, Form the tribes, team cards |
| `client/src/pages/Play.jsx` | Participant state machine driven by server status |
| `client/src/components/steps.jsx` | Join, Questions, Waiting, Reveal, Challenge, Summary, Feedback, Done screens |
| `client/src/components/ui.jsx` | Screen layout, footer attribution, buttons, cards, confetti |
| `client/src/pages/Stats.jsx` | Results dashboard |
| `client/src/lib/` | API wrapper, safe localStorage helpers, socket hook |
| `scripts/smoke.mjs` | End-to-end API test of a full game |
| `render.yaml` | Render deployment blueprint |
| `.env.example` | Environment variable template |
| `prd.md`, `IMPLEMENTATION.md`, `README.md`, `KB.md` | Spec, technical plan, run/deploy guide, this knowledge base |

---

## 6. Data model, API and live events

Three MongoDB collections hold everything. The server is the single source of truth, and sockets only announce that something changed.

### Collections

| Collection | Key fields |
|---|---|
| Room | `code` (5 characters, no look-alike letters), `hostTokenHash`, `status` (lobby, grouping, grouped), `isTest`, `startedAt` |
| Participant | `roomCode`, `tokenHash`, `deviceId`, `nickname`, `avatar`, `answers[5]`, `status`, `teamId`, `answeredAt`, `challengeStartedAt`, `challengeDoneAt`, `feedback`, `feedbackAt` |
| Team | `roomCode`, `name`, `emoji`, `color`, `connection`, `starter`, `challengeId`, `memberIds`, `challengeStartedAt`, `challengeCompletedAt` |

Participant status only moves forward: `joined → answered → grouped → challenge_started → challenge_done → feedback_done`. Tokens are stored only as SHA-256 hashes.

### REST API

| Method and path | Access | Purpose |
|---|---|---|
| `POST /api/rooms` | Anyone | Create a room; returns code and host token. `isTest` marks a rehearsal room |
| `GET /api/rooms/:code` | Anyone | Room status and counts |
| `GET /api/rooms/:code/host` | Host token | Counts, player list, teams |
| `POST /api/rooms/:code/start` | Host token | Form the tribes; needs at least 2 people who answered |
| `POST /api/rooms/:code/join` | Anyone | Nickname, avatar, deviceId; returns participant token |
| `GET /api/me` | Participant token | Own status, team and teammates, room counts |
| `POST /api/me/answers` | Participant token | Submit 5 answers; late arrivals are placed in a team immediately |
| `POST /api/me/challenge/start` | Participant token | "We found each other" |
| `POST /api/me/challenge/complete` | Participant token | "We did it"; marks the whole team done |
| `POST /api/me/feedback` | Participant token | The two feedback answers |
| `GET /api/stats` | Anyone | Dashboard numbers, test rooms excluded |
| `GET /api/health` | Anyone | Health check for hosting |

Headers: host calls send `x-host-token`; participant calls send `x-participant-token`.
Limits: 80 players per room, nickname 20 characters, 1,200 API requests per minute per IP (a hostel may share one IP).

### Socket events

| Event | Sent when | Screen reaction |
|---|---|---|
| `room:counts` | Join, answer, challenge done, feedback | Host counts and waiting room update |
| `room:status` | Host forms the tribes | Every phone reloads its state and moves to the reveal |
| `team:update` | Late joiner added, challenge started or completed | Teammates' screens stay in sync |

Clients join a room channel with `socket.emit('room:watch', CODE)`. Phones also reload their state on reconnect and when the screen wakes.

---

## 7. Grouping engine and team identity

The engine puts people with similar answers together while keeping every team at 3–4 people. It runs in milliseconds and needs no machine learning.

### Group sizes

Five or fewer people form one group. Otherwise the number of groups is the headcount divided by 4, rounded up, with people spread evenly. This reproduces every row of the PRD table and never creates a group of 1 or 2 when there are 6 or more people.

```js
function groupSizes(n) {
  if (n <= 5) return [n];
  const k = Math.ceil(n / 4);
  const base = Math.floor(n / k), extra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
}
```

### Similarity

Similarity between two people is the weighted count of answers they share. Question weights: destination **2**, personality **1.5**, free evening **1.5**, excitement **1**, unforgettable **1**. Destination counts most because it sets the team theme.

### Algorithm

1. **Seeds:** pick one starting person per team. The first is the most typical person in the room; each next one is the person least like the seeds so far.
2. **Fill:** repeatedly take the person with the strongest preference for one team over the others, and place them in their best team that still has room. The room limit guarantees balance and that nobody is left out.
3. **Polish:** swap pairs of people between teams whenever the swap raises total similarity inside teams. Sizes never change.
4. **Late arrivals:** anyone who finishes the questions after the host starts joins the smallest team, choosing the best fit among the smallest.

### Team identity

| Part | How it is chosen |
|---|---|
| Name and emoji | The answer most of the team shares, preferring destination, then free evening. Examples: Sunset Squad (beach), Mountain Explorers, City Hoppers, Wild Trailblazers, Food Hunters, Game Night Crew. No two teams in a room share a name |
| Color | One of 8 high-contrast colors, unique per room |
| What connects you | Up to 3 answers shared by at least half the team, e.g. "You all love beach sunsets, the people you meet along the way and hunting for great food!" A fallback line covers teams with nothing in common |
| Challenge | Scored by how well its tags match the team's answer tags; random pick among the top 3 not yet used in the room |
| Conversation starter | Based on the team's main destination answer; a general question if there is none |

The unit tests check:
- the PRD size table
- sizes for 6–60 people
- that everyone is placed exactly once, for 2–40 people
- that identical profiles end up together
- that team names and challenges are unique
- late-joiner placement

---

## 8. Results dashboard

The `/stats` page shows only real usage, refreshes every 15 seconds, and leaves out any room created from `/?test=1`.

| Metric | How it is counted |
|---|---|
| Unique participants | Distinct device IDs (a random ID kept in the browser) |
| Total joins | Participant records |
| Rooms created / played | Non-test rooms / those where tribes were formed |
| Completed questions | Participants with all 5 answers, plus share of joins |
| Tribes formed | Teams |
| Started a challenge | Participants who tapped "We found each other" |
| Completed a challenge | Participants on teams marked done, plus count of teams done |
| Submitted feedback | Participants who sent feedback |
| Talked to someone new | "Yes" answers, plus share of feedback |
| Would repeat | Yes / Maybe / No split |

**Use test mode (`/?test=1`) for every rehearsal so the submission numbers stay honest.**

---

## 9. Run, test and deploy

Locally the app needs only Node.js. Production needs a free MongoDB Atlas cluster and a Render web service.

### Run locally

```bash
npm install          # server dependencies
npm run build        # installs client dependencies and builds client/dist
npm start            # http://localhost:4000
```

- Without `MONGO_URI`, the server starts a temporary in-memory database that resets on restart.
- For hot reload, run `npm install --prefix client`, then `npm run dev`. Phones on the same Wi-Fi can open `http://<PC IP>:5173`.

### Test

```bash
npm test                    # grouping engine unit tests
node scripts/smoke.mjs      # full game through the API, against a running server
```

### Deploy

1. **MongoDB Atlas:** create a free M0 cluster, add a database user, allow network access from `0.0.0.0/0`, and copy the connection string.
2. Push the project to a GitHub repository.
3. **Render:** New → Blueprint, then pick the repo (it reads `render.yaml`). Or create a Web Service with build command `npm install && npm run build` and start command `npm start`.
4. Set the environment variables `NODE_ENV=production` and `MONGO_URI=<Atlas string>`.
5. Open the Render URL, create a test room with `/?test=1`, and scan the QR code with a phone.

⚠️ The free Render plan sleeps after 15 idle minutes and then takes about 30–60 seconds to wake. Open the site a minute before every session, or use the $7 plan for the sprint.

### Environment variables

```
MONGO_URI=      # Atlas connection string (required in production)
PORT=4000
NODE_ENV=production
```

---

## 10. Build status and phases

Phases 0–7 are done as of Nov 23. Deployment, field testing and submission remain before the deadline on **Nov 25, 2026, 10:00 PM**.

### Verified so far

| Check | Result |
|---|---|
| Grouping unit tests | 6 of 6 pass |
| API smoke test (10 players + 1 late joiner) | Pass: teams of 4, 3, 3; late joiner placed; counts correct; test room excluded from stats |
| Browser test on a phone-sized screen (headless Edge) | Pass: join, questions, waiting, host forms tribes, reveal, challenge, summary, refresh resumes, feedback, done, stats, unknown room. No browser errors |
| Client bundle size | 85 KB gzipped JavaScript, 6 KB CSS |

### Phases

| # | Phase | Status | Notes |
|---|---|---|---|
| 0 | Setup: project, dependencies, dev database | ✅ Done | In-memory MongoDB for development |
| 1 | Backend: rooms, join, answers, sockets | ✅ Done | |
| 2 | Grouping engine and tests | ✅ Done | |
| 3 | Participant screens | ✅ Done | Join to reveal, with resume on refresh |
| 4 | Host screen | ✅ Done | QR, live counts, teams |
| 5 | Challenge, summary, feedback | ✅ Done | |
| 6 | Dashboard and production build | ✅ Done | Deployment itself still open |
| 7 | Polish and edge cases | ✅ Done | Late joiners, rate limit, input limits |
| 8 | Deploy to Render with Atlas | ⬜ Not started | Needs the owner's Atlas, GitHub and Render accounts |
| 9 | Real-world testing, about 30 people | ⬜ Not started | |
| 10 | Loom video, write-up, submit | ⬜ Not started | Before 10:00 PM on Nov 25 |

A git repository is initialised in the project folder, but no code has been committed yet.

---

## 11. Risks, field testing and submission

The biggest remaining risks are a sleeping server at the start of a session and test data mixing into the results. Both have simple fixes.

### Risks

| Risk | Mitigation |
|---|---|
| Render free plan cold start during a live session | Open the site 1–2 minutes before, or use the paid plan |
| Hostel Wi-Fi blocks WebSockets | Socket.IO falls back to long-polling automatically |
| A phone locks or refreshes mid-game | Session token in the browser; state reloads on wake |
| Someone never finishes the questions | Host can start with 2 or more ready; late finishers join a team automatically |
| Rehearsal data inflates results | Create rehearsal rooms from `/?test=1`; they are excluded |
| Running out of time | Deploy first, then test; polish only after real sessions |

### Field-testing playbook

- [ ] Pick 3–4 spots: college hostel, PG common room, canteen, café
- [ ] Wake the server and create a fresh, **non-test** room on the host phone
- [ ] Show the QR code; aim for 6–10 people per session
- [ ] Watch whether people understand it, finish the questions, find teammates, start talking, enjoy the challenge, and keep talking afterwards
- [ ] With consent, record short clips for the Loom
- [ ] Note confusion points and fix them between sessions
- [ ] Check `/stats` after each session

### Submission checklist

- [ ] Public working link, mobile-friendly
- [ ] 3-minute Loom: problem, solution, working product, real-world testing, real participant numbers
- [ ] Half-page explanation: thinking behind the idea, why interest-based grouping, how it was tested, actual participant count, feedback and lessons
- [ ] Attribution visible on every page
- [ ] Results show real data only
- [ ] Submitted before **10:00 PM on Nov 25, 2026**

---

_Built by Parth Makwana for the goSTOPS Build Sprint. Not an official goSTOPS product._
