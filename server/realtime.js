import { Participant } from './models.js';

let io = null;
export function setIO(instance) { io = instance; }

export const channel = (code) => `room:${code}`;

export async function roomCounts(code) {
  const [joined, answered, grouped, challengeDone, feedback] = await Promise.all([
    Participant.countDocuments({ roomCode: code }),
    Participant.countDocuments({ roomCode: code, 'answers.4': { $exists: true } }),
    Participant.countDocuments({ roomCode: code, teamId: { $ne: null } }),
    Participant.countDocuments({ roomCode: code, challengeDoneAt: { $ne: null } }),
    Participant.countDocuments({ roomCode: code, feedbackAt: { $ne: null } }),
  ]);
  return { joined, answered, grouped, challengeDone, feedback };
}

export async function emitCounts(code) {
  if (!io) return;
  io.to(channel(code)).emit('room:counts', await roomCounts(code));
}

export function emitStatus(code, status) {
  io?.to(channel(code)).emit('room:status', { status });
}

export function emitTeam(code, teamId) {
  io?.to(channel(code)).emit('team:update', { teamId: String(teamId) });
}
