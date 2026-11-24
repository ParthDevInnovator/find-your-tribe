// Team identity: name, emoji, color, "what connects you", challenge, starter.
import {
  QUESTIONS, TEAM_COLORS, CHALLENGES, STARTERS, DEFAULT_STARTER,
} from '../shared/gameData.js';

const NAME_PRIORITY = [0, 2, 1, 4, 3]; // destination, evening, personality, unforgettable, excites

function answerCounts(membersAnswers) {
  return QUESTIONS.map((q, qi) => {
    const counts = q.options.map(() => 0);
    for (const a of membersAnswers) if (Number.isInteger(a[qi])) counts[a[qi]]++;
    return counts;
  });
}

function joinPhrases(list) {
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

export function connectionLine(membersAnswers) {
  const size = membersAnswers.length;
  const counts = answerCounts(membersAnswers);
  const shared = [];
  counts.forEach((c, qi) => c.forEach((count, oi) => {
    if (count >= 2 && count >= size / 2) shared.push({ qi, oi, count });
  }));
  shared.sort((a, b) => b.count - a.count || NAME_PRIORITY.indexOf(a.qi) - NAME_PRIORITY.indexOf(b.qi));
  const top = shared.slice(0, 3);
  if (!top.length) {
    return "You're a perfect mix of planners and free spirits — the best trips need both!";
  }
  const phrases = top.map((s) => QUESTIONS[s.qi].options[s.oi].phrase);
  const allShare = top[0].count === size;
  return `${allShare ? 'You all' : 'Most of you'} love ${joinPhrases(phrases)}!`;
}

function tagScores(membersAnswers) {
  const scores = {};
  for (const a of membersAnswers) {
    a.forEach((oi, qi) => {
      for (const tag of QUESTIONS[qi]?.options[oi]?.tags ?? []) scores[tag] = (scores[tag] || 0) + 1;
    });
  }
  return scores;
}

export function pickChallenge(membersAnswers, usedIds = new Set(), rand = Math.random) {
  const scores = tagScores(membersAnswers);
  const ranked = CHALLENGES
    .map((c) => ({ c, s: c.tags.reduce((sum, t) => sum + (scores[t] || 0), 0) / Math.sqrt(c.tags.length) }))
    .sort((a, b) => b.s - a.s);
  const fresh = ranked.filter((r) => !usedIds.has(r.c.id));
  const pool = (fresh.length ? fresh : ranked).slice(0, 3);
  return pool[Math.floor(rand() * pool.length)].c.id;
}

/**
 * @param {number[][][]} teamsAnswers - per team, list of member answer arrays
 * @returns {{name, emoji, color, connection, starter, challengeId}[]}
 */
export function describeTeams(teamsAnswers, rand = Math.random) {
  const usedNames = new Set();
  const usedChallenges = new Set();
  return teamsAnswers.map((membersAnswers, ti) => {
    const counts = answerCounts(membersAnswers);
    const candidates = [];
    counts.forEach((c, qi) => c.forEach((count, oi) => {
      if (count > 0) candidates.push({ qi, oi, count });
    }));
    candidates.sort((a, b) => b.count - a.count || NAME_PRIORITY.indexOf(a.qi) - NAME_PRIORITY.indexOf(b.qi));
    const chosen = candidates.find((c) => !usedNames.has(QUESTIONS[c.qi].options[c.oi].team.name));
    const identity = chosen
      ? QUESTIONS[chosen.qi].options[chosen.oi].team
      : { emoji: '🧳', name: `Tribe ${ti + 1}` };
    usedNames.add(identity.name);

    const destCounts = counts[0];
    const topDest = destCounts.indexOf(Math.max(...destCounts));
    const starter = Math.max(...destCounts) >= 2 ? STARTERS[topDest] : DEFAULT_STARTER;

    const challengeId = pickChallenge(membersAnswers, usedChallenges, rand);
    usedChallenges.add(challengeId);

    return {
      name: identity.name,
      emoji: identity.emoji,
      color: TEAM_COLORS[ti % TEAM_COLORS.length],
      connection: connectionLine(membersAnswers),
      starter,
      challengeId,
    };
  });
}
