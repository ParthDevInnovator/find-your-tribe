import express from 'express';
import crypto from 'node:crypto';
import { Room, Participant, Team } from './models.js';
import { groupParticipants, pickTeamForLateJoiner } from './grouping.js';
import { describeTeams } from './identity.js';
import { emitCounts, emitStatus, emitTeam, roomCounts } from './realtime.js';
import { AVATARS, QUESTIONS } from '../shared/gameData.js';

const router = express.Router();

// ---------- helpers ----------
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });
const newToken = () => crypto.randomBytes(24).toString('hex');
const hash = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const normalizeCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const MAX_PLAYERS_PER_ROOM = 80;

async function uniqueRoomCode() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const bytes = crypto.randomBytes(5);
    const code = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
    if (!(await Room.exists({ code }))) return code;
  }
  throw httpError(500, 'Could not create a room code, please retry');
}

async function loadRoom(req) {
  const code = normalizeCode(req.params.code);
  const room = await Room.findOne({ code });
  if (!room) throw httpError(404, 'Room not found');
  return room;
}

const hostAuth = wrap(async (req, _res, next) => {
  const room = await loadRoom(req);
  const token = req.get('x-host-token');
  if (!token || hash(token) !== room.hostTokenHash) throw httpError(401, 'Host access required');
  req.room = room;
  next();
});

const participantAuth = wrap(async (req, _res, next) => {
  const token = req.get('x-participant-token');
  if (!token) throw httpError(401, 'Not joined');
  const p = await Participant.findOne({ tokenHash: hash(token) });
  if (!p) throw httpError(401, 'Not joined');
  req.participant = p;
  next();
});

async function teamView(team, meId) {
  const members = await Participant.find({ _id: { $in: team.memberIds } }, { nickname: 1, avatar: 1, status: 1 });
  const byId = new Map(members.map((m) => [String(m._id), m]));
  return {
    id: String(team._id),
    name: team.name,
    emoji: team.emoji,
    color: team.color,
    connection: team.connection,
    starter: team.starter,
    challengeId: team.challengeId,
    challengeStartedAt: team.challengeStartedAt || null,
    challengeCompletedAt: team.challengeCompletedAt || null,
    members: team.memberIds
      .map((id) => byId.get(String(id)))
      .filter(Boolean)
      .map((m) => ({
        id: String(m._id), nickname: m.nickname, avatar: m.avatar,
        isMe: meId ? String(m._id) === String(meId) : undefined,
      })),
  };
}

async function mePayload(p) {
  const room = await Room.findOne({ code: p.roomCode }, { code: 1, status: 1 });
  const team = p.teamId ? await Team.findById(p.teamId) : null;
  return {
    participant: {
      id: String(p._id), nickname: p.nickname, avatar: p.avatar, status: p.status,
      answered: p.answers.length === QUESTIONS.length,
    },
    room: { code: room.code, status: room.status },
    team: team ? await teamView(team, p._id) : null,
    counts: await roomCounts(p.roomCode),
  };
}

/** Put a participant who finished the questions after grouping into the best small team. */
async function assignLate(p) {
  const teams = await Team.find({ roomCode: p.roomCode });
  if (!teams.length) return;
  const members = await Participant.find({ teamId: { $in: teams.map((t) => t._id) } }, { answers: 1, teamId: 1 });
  const teamId = pickTeamForLateJoiner(p.answers, teams.map((t) => ({
    id: String(t._id),
    membersAnswers: members.filter((m) => String(m.teamId) === String(t._id)).map((m) => m.answers),
  })));
  await Team.updateOne({ _id: teamId }, { $addToSet: { memberIds: p._id } });
  await Participant.updateOne({ _id: p._id }, { $set: { teamId, status: 'grouped' } });
  emitTeam(p.roomCode, teamId);
}

// ---------- routes ----------
router.get('/health', (_req, res) => res.json({ ok: true }));

router.post('/rooms', wrap(async (req, res) => {
  const code = await uniqueRoomCode();
  const hostToken = newToken();
  await Room.create({ code, hostTokenHash: hash(hostToken), isTest: req.body?.isTest === true });
  res.status(201).json({ code, hostToken });
}));

router.get('/rooms/:code', wrap(async (req, res) => {
  const room = await loadRoom(req);
  res.json({ code: room.code, status: room.status, counts: await roomCounts(room.code) });
}));

router.get('/rooms/:code/host', hostAuth, wrap(async (req, res) => {
  const { room } = req;
  const [players, teams] = await Promise.all([
    Participant.find({ roomCode: room.code }, { nickname: 1, avatar: 1, status: 1, answers: 1 }).sort({ createdAt: 1 }),
    Team.find({ roomCode: room.code }).sort({ createdAt: 1 }),
  ]);
  res.json({
    room: { code: room.code, status: room.status, isTest: room.isTest },
    counts: await roomCounts(room.code),
    players: players.map((p) => ({
      id: String(p._id), nickname: p.nickname, avatar: p.avatar, status: p.status,
      answered: p.answers.length === QUESTIONS.length,
    })),
    teams: await Promise.all(teams.map((t) => teamView(t))),
  });
}));

router.post('/rooms/:code/start', hostAuth, wrap(async (req, res) => {
  const { code } = req.room;
  if (req.room.status === 'grouped') return res.json({ ok: true, alreadyGrouped: true });

  const readyFilter = { roomCode: code, 'answers.4': { $exists: true }, teamId: null };
  if ((await Participant.countDocuments(readyFilter)) < 2) {
    throw httpError(400, 'At least 2 people need to finish the questions first');
  }
  const locked = await Room.findOneAndUpdate({ code, status: 'lobby' }, { status: 'grouping' });
  if (!locked) throw httpError(409, 'Tribes are already being formed');

  try {
    const people = await Participant.find(readyFilter);
    const groups = groupParticipants(people.map((p) => ({ id: String(p._id), answers: p.answers })));
    const answersById = new Map(people.map((p) => [String(p._id), p.answers]));
    const identities = describeTeams(groups.map((g) => g.map((id) => answersById.get(id))));
    const teams = await Team.insertMany(groups.map((memberIds, i) => ({ roomCode: code, ...identities[i], memberIds })));
    await Participant.bulkWrite(teams.flatMap((t) => t.memberIds.map((id) => ({
      updateOne: { filter: { _id: id }, update: { $set: { teamId: t._id, status: 'grouped' } } },
    }))));
    await Room.updateOne({ code }, { status: 'grouped', startedAt: new Date() });
  } catch (err) {
    await Room.updateOne({ code }, { status: 'lobby' });
    throw err;
  }

  // Anyone who finished answering while grouping ran gets placed now.
  const stragglers = await Participant.find(readyFilter);
  for (const p of stragglers) await assignLate(p);

  emitStatus(code, 'grouped');
  await emitCounts(code);
  res.json({ ok: true });
}));

router.post('/rooms/:code/join', wrap(async (req, res) => {
  const room = await loadRoom(req);
  const nickname = String(req.body?.nickname ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20);
  const avatar = String(req.body?.avatar ?? '');
  const deviceId = String(req.body?.deviceId ?? '').slice(0, 64) || undefined;
  if (!nickname) throw httpError(400, 'Please enter a nickname');
  if (!AVATARS.includes(avatar)) throw httpError(400, 'Please pick an avatar');
  if ((await Participant.countDocuments({ roomCode: room.code })) >= MAX_PLAYERS_PER_ROOM) {
    throw httpError(400, 'This room is full — ask the host to create another one');
  }
  const token = newToken();
  const p = await Participant.create({ roomCode: room.code, tokenHash: hash(token), deviceId, nickname, avatar });
  await emitCounts(room.code);
  res.status(201).json({ participantId: String(p._id), participantToken: token });
}));

router.get('/me', participantAuth, wrap(async (req, res) => {
  res.json(await mePayload(req.participant));
}));

router.post('/me/answers', participantAuth, wrap(async (req, res) => {
  const p = req.participant;
  const answers = req.body?.answers;
  const valid = Array.isArray(answers) && answers.length === QUESTIONS.length &&
    answers.every((a, i) => Number.isInteger(a) && a >= 0 && a < QUESTIONS[i].options.length);
  if (!valid) throw httpError(400, 'Please answer all five questions');
  if (p.teamId) return res.json(await mePayload(p)); // already placed; answers are locked

  p.answers = answers;
  p.answeredAt = new Date();
  p.status = 'answered';
  await p.save();

  const room = await Room.findOne({ code: p.roomCode }, { status: 1 });
  if (room.status === 'grouped') await assignLate(p);
  await emitCounts(p.roomCode);
  res.json(await mePayload(await Participant.findById(p._id)));
}));

router.post('/me/challenge/start', participantAuth, wrap(async (req, res) => {
  const p = req.participant;
  if (!p.teamId) throw httpError(400, 'You are not in a team yet');
  const now = new Date();
  await Team.updateOne({ _id: p.teamId, challengeStartedAt: null }, { $set: { challengeStartedAt: now } });
  const update = { challengeStartedAt: p.challengeStartedAt || now };
  if (p.status === 'grouped') update.status = 'challenge_started';
  await Participant.updateOne({ _id: p._id }, { $set: update });
  emitTeam(p.roomCode, p.teamId);
  res.json(await mePayload(await Participant.findById(p._id)));
}));

router.post('/me/challenge/complete', participantAuth, wrap(async (req, res) => {
  const p = req.participant;
  if (!p.teamId) throw httpError(400, 'You are not in a team yet');
  const now = new Date();
  await Team.updateOne({ _id: p.teamId, challengeStartedAt: null }, { $set: { challengeStartedAt: now } });
  await Team.updateOne({ _id: p.teamId, challengeCompletedAt: null }, { $set: { challengeCompletedAt: now } });
  await Participant.updateMany({ teamId: p.teamId, challengeDoneAt: null }, { $set: { challengeDoneAt: now } });
  await Participant.updateMany(
    { teamId: p.teamId, status: { $in: ['grouped', 'challenge_started'] } },
    { $set: { status: 'challenge_done' } },
  );
  emitTeam(p.roomCode, p.teamId);
  await emitCounts(p.roomCode);
  res.json(await mePayload(await Participant.findById(p._id)));
}));

router.post('/me/feedback', participantAuth, wrap(async (req, res) => {
  const p = req.participant;
  const { talkedToNew, wouldRepeat } = req.body ?? {};
  if (typeof talkedToNew !== 'boolean' || !['yes', 'maybe', 'no'].includes(wouldRepeat)) {
    throw httpError(400, 'Please answer both questions');
  }
  if (!p.teamId) throw httpError(400, 'You are not in a team yet');
  p.feedback = { talkedToNew, wouldRepeat };
  p.feedbackAt = p.feedbackAt || new Date();
  p.challengeDoneAt = p.challengeDoneAt || new Date();
  p.status = 'feedback_done';
  await p.save();
  await emitCounts(p.roomCode);
  res.json(await mePayload(p));
}));

// Results dashboard — real usage only; rooms created as test rooms are excluded.
router.get('/stats', wrap(async (_req, res) => {
  const testCodes = (await Room.find({ isTest: true }, { code: 1 })).map((r) => r.code);
  const pf = { roomCode: { $nin: testCodes } };
  const count = (extra) => Participant.countDocuments({ ...pf, ...extra });
  const [
    rooms, roomsPlayed, participants, uniqueDevices, answered, teams, teamsCompleted,
    challengeStarted, challengeDone, feedback, talkedToNew, repeatYes, repeatMaybe, repeatNo,
  ] = await Promise.all([
    Room.countDocuments({ isTest: { $ne: true } }),
    Room.countDocuments({ isTest: { $ne: true }, status: 'grouped' }),
    count({}),
    Participant.distinct('deviceId', { ...pf, deviceId: { $ne: null } }),
    count({ 'answers.4': { $exists: true } }),
    Team.countDocuments({ roomCode: { $nin: testCodes } }),
    Team.countDocuments({ roomCode: { $nin: testCodes }, challengeCompletedAt: { $ne: null } }),
    count({ challengeStartedAt: { $ne: null } }),
    count({ challengeDoneAt: { $ne: null } }),
    count({ feedbackAt: { $ne: null } }),
    count({ 'feedback.talkedToNew': true }),
    count({ 'feedback.wouldRepeat': 'yes' }),
    count({ 'feedback.wouldRepeat': 'maybe' }),
    count({ 'feedback.wouldRepeat': 'no' }),
  ]);
  res.json({
    rooms, roomsPlayed, participants,
    uniqueParticipants: uniqueDevices.length,
    answered, teams, teamsCompleted, challengeStarted, challengeDone,
    feedback, talkedToNew,
    wouldRepeat: { yes: repeatYes, maybe: repeatMaybe, no: repeatNo },
    updatedAt: new Date().toISOString(),
  });
}));

export default router;
