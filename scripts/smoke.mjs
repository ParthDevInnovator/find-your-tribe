// End-to-end API smoke test: node scripts/smoke.mjs [baseUrl]
// Creates a TEST room, joins 10 players (+1 late), plays the full journey.
const BASE = process.argv[2] || 'http://localhost:4000';

async function call(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${data.error}`);
  return data;
}
const assert = (cond, msg) => { if (!cond) throw new Error(`ASSERT: ${msg}`); };

const { code, hostToken } = await call('/rooms', { method: 'POST', body: { isTest: true } });
const host = { 'x-host-token': hostToken };
console.log('room', code);

const AVATARS = ['🦊', '🐼', '🐨', '🐯', '🦁'];
const players = [];
for (let i = 0; i < 10; i++) {
  const { participantToken } = await call(`/rooms/${code}/join`, {
    method: 'POST', body: { nickname: `P${i}`, avatar: AVATARS[i % 5], deviceId: `smoke-${code}-${i}` },
  });
  players.push({ name: `P${i}`, h: { 'x-participant-token': participantToken } });
}

// Bad input is rejected
await call(`/rooms/${code}/join`, { method: 'POST', body: { nickname: '', avatar: '🦊' } }).then(
  () => { throw new Error('empty nickname accepted'); }, () => {});
await call('/me/answers', { method: 'POST', headers: players[0].h, body: { answers: [9, 0, 0, 0, 0] } }).then(
  () => { throw new Error('bad answers accepted'); }, () => {});

// Start must fail before anyone answered
await call(`/rooms/${code}/start`, { method: 'POST', headers: host }).then(
  () => { throw new Error('start allowed with 0 answered'); }, () => {});
await call(`/rooms/${code}/start`, { method: 'POST' }).then(
  () => { throw new Error('start allowed without host token'); }, () => {});

for (const [i, p] of players.entries()) {
  const answers = [i % 4, (i * 3) % 4, i % 2, (i + 1) % 4, i % 4];
  await call('/me/answers', { method: 'POST', headers: p.h, body: { answers } });
}

await call(`/rooms/${code}/start`, { method: 'POST', headers: host });
const hostView = await call(`/rooms/${code}/host`, { headers: host });
const sizes = hostView.teams.map((t) => t.members.length).sort();
console.log('teams:', hostView.teams.map((t) => `${t.emoji} ${t.name} [${t.members.map((m) => m.nickname).join(', ')}] ch#${t.challengeId}`));
assert(JSON.stringify(sizes) === JSON.stringify([3, 3, 4]), `sizes ${sizes}`);

// Late joiner gets added to a team
const late = await call(`/rooms/${code}/join`, { method: 'POST', body: { nickname: 'Late', avatar: '🐸', deviceId: `smoke-${code}-late` } });
const lateH = { 'x-participant-token': late.participantToken };
const lateMe = await call('/me/answers', { method: 'POST', headers: lateH, body: { answers: [0, 0, 0, 0, 0] } });
assert(lateMe.team && lateMe.participant.status === 'grouped', 'late joiner not placed');
console.log('late joiner →', lateMe.team.name, `(${lateMe.team.members.length} members)`);

// Full journey for everyone
for (const p of players) {
  const me = await call('/me', { headers: p.h });
  assert(me.team && me.team.members.some((m) => m.isMe), 'me.team missing');
  await call('/me/challenge/start', { method: 'POST', headers: p.h });
}
// One person per team completes → whole team done
const done = new Set();
for (const p of players) {
  const me = await call('/me', { headers: p.h });
  if (!done.has(me.team.id)) {
    const after = await call('/me/challenge/complete', { method: 'POST', headers: p.h });
    assert(after.participant.status === 'challenge_done', 'complete failed');
    done.add(me.team.id);
  }
}
for (const [i, p] of players.entries()) {
  const me = await call('/me', { headers: p.h });
  assert(me.participant.status === 'challenge_done', `${p.name} not challenge_done: ${me.participant.status}`);
  await call('/me/feedback', { method: 'POST', headers: p.h, body: { talkedToNew: i % 3 !== 0, wouldRepeat: ['yes', 'maybe', 'no'][i % 3] } });
}

const counts = (await call(`/rooms/${code}/host`, { headers: host })).counts;
console.log('counts', counts);
assert(counts.joined === 11 && counts.answered === 11 && counts.feedback === 10, 'counts wrong');

const stats = await call('/stats');
console.log('stats (test room excluded)', stats.participants, 'participants');
console.log('✅ smoke test passed');
