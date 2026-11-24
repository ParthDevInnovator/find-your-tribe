import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupSizes, groupParticipants, pickTeamForLateJoiner } from './grouping.js';
import { describeTeams } from './identity.js';

const PRD_TABLE = { 2: [2], 3: [3], 6: [3, 3], 7: [4, 3], 8: [4, 4], 9: [3, 3, 3], 10: [4, 3, 3], 12: [4, 4, 4] };

test('groupSizes matches the PRD table', () => {
  for (const [n, sizes] of Object.entries(PRD_TABLE)) assert.deepEqual(groupSizes(Number(n)), sizes);
  assert.equal(groupSizes(4).length, 1);
  assert.equal(groupSizes(5).length, 1);
});

test('groupSizes never creates groups smaller than 3 or larger than 4 for n >= 6', () => {
  for (let n = 6; n <= 60; n++) {
    const sizes = groupSizes(n);
    assert.equal(sizes.reduce((a, b) => a + b, 0), n);
    for (const s of sizes) assert.ok(s >= 3 && s <= 4, `n=${n} sizes=${sizes}`);
  }
});

function randomPeople(n, seed = 1) {
  let x = seed;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, answers: Array.from({ length: 5 }, () => Math.floor(rnd() * 4)) }));
}

test('everyone is placed exactly once with correct sizes', () => {
  for (let n = 2; n <= 40; n++) {
    const people = randomPeople(n, n);
    const teams = groupParticipants(people);
    const ids = teams.flat();
    assert.equal(ids.length, n);
    assert.equal(new Set(ids).size, n);
    assert.deepEqual(teams.map((t) => t.length).sort(), groupSizes(n).slice().sort());
  }
});

test('identical answer profiles end up together', () => {
  const beach = [0, 1, 1, 0, 2];
  const mountain = [1, 0, 3, 1, 1];
  const city = [2, 2, 2, 2, 0];
  const people = [
    ...[0, 1, 2].map((i) => ({ id: `b${i}`, answers: beach })),
    ...[0, 1, 2].map((i) => ({ id: `m${i}`, answers: mountain })),
    ...[0, 1, 2].map((i) => ({ id: `c${i}`, answers: city })),
  ].sort(() => 0.5 - Math.random());
  const teams = groupParticipants(people);
  assert.equal(teams.length, 3);
  for (const t of teams) assert.equal(new Set(t.map((id) => id[0])).size, 1, JSON.stringify(teams));
});

test('team identities are unique and complete', () => {
  const people = randomPeople(12, 7);
  const teams = groupParticipants(people);
  const byId = Object.fromEntries(people.map((p) => [p.id, p.answers]));
  const ids = describeTeams(teams.map((t) => t.map((id) => byId[id])));
  assert.equal(new Set(ids.map((t) => t.name)).size, ids.length);
  assert.equal(new Set(ids.map((t) => t.challengeId)).size, ids.length);
  for (const t of ids) {
    assert.ok(t.name && t.emoji && t.color && t.connection && t.starter && t.challengeId);
  }
});

test('late joiner goes to a smallest team', () => {
  const teamId = pickTeamForLateJoiner([0, 0, 0, 0, 0], [
    { id: 'A', membersAnswers: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]] },
    { id: 'B', membersAnswers: [[1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]] },
  ]);
  assert.equal(teamId, 'B');
});
