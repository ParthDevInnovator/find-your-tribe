// Grouping engine: turns a room of answered participants into balanced,
// interest-matched teams of ~3–4. Pure functions, no DB access.

export const WEIGHTS = [2, 1.5, 1.5, 1, 1]; // Q1 (destination) drives the theme most

/** Team sizes for n people. 2–5 → one group; otherwise groups of 3–4. */
export function groupSizes(n) {
  if (n <= 0) return [];
  if (n <= 5) return [n];
  const k = Math.ceil(n / 4);
  const base = Math.floor(n / k);
  const extra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
}

export function similarity(a, b) {
  let s = 0;
  for (let q = 0; q < WEIGHTS.length; q++) if (a[q] === b[q]) s += WEIGHTS[q];
  return s;
}

/**
 * @param {{id: string, answers: number[]}[]} people
 * @returns {string[][]} team member ids
 */
export function groupParticipants(people) {
  const n = people.length;
  if (n === 0) return [];
  const sizes = groupSizes(n);
  const k = sizes.length;
  if (k === 1) return [people.map((p) => p.id)];

  // Similarity matrix
  const S = people.map((a) => people.map((b) => similarity(a.answers, b.answers)));
  const total = S.map((row) => row.reduce((x, y) => x + y, 0));

  // 1. Seeds: most "central" person first, then the person least similar to
  //    existing seeds (ties → more central, so seeds represent real clusters).
  const seeds = [total.indexOf(Math.max(...total))];
  while (seeds.length < k) {
    let best = -1, bestMax = Infinity, bestTotal = -1;
    for (let i = 0; i < n; i++) {
      if (seeds.includes(i)) continue;
      const maxSim = Math.max(...seeds.map((s) => S[i][s]));
      if (maxSim < bestMax || (maxSim === bestMax && total[i] > bestTotal)) {
        best = i; bestMax = maxSim; bestTotal = total[i];
      }
    }
    seeds.push(best);
  }

  // Bigger target sizes go to the first teams; seeds take one slot each.
  const teams = seeds.map((s) => [s]);
  const capacity = sizes.slice();
  const remaining = new Set([...Array(n).keys()].filter((i) => !seeds.includes(i)));

  const affinity = (i, t) => teams[t].reduce((sum, m) => sum + S[i][m], 0) / teams[t].length;

  // 2. Fill: repeatedly place the person with the strongest preference
  //    (largest regret) into their best team that still has room.
  while (remaining.size) {
    let pick = -1, pickTeam = -1, pickRegret = -Infinity;
    for (const i of remaining) {
      const open = teams.map((_, t) => t).filter((t) => teams[t].length < capacity[t]);
      const scored = open.map((t) => ({ t, s: affinity(i, t) })).sort((a, b) => b.s - a.s);
      const regret = scored.length > 1 ? scored[0].s - scored[1].s : Infinity;
      if (regret > pickRegret) { pick = i; pickTeam = scored[0].t; pickRegret = regret; }
    }
    teams[pickTeam].push(pick);
    remaining.delete(pick);
  }

  // 3. Polish: pairwise swaps between teams while they increase total
  //    within-team similarity. Sizes never change, so balance holds.
  const sumTo = (i, members, exclude) =>
    members.reduce((s, m) => (m === i || m === exclude ? s : s + S[i][m]), 0);
  for (let pass = 0; pass < 20; pass++) {
    let improved = false;
    for (let a = 0; a < k; a++) {
      for (let b = a + 1; b < k; b++) {
        for (let x = 0; x < teams[a].length; x++) {
          for (let y = 0; y < teams[b].length; y++) {
            const i = teams[a][x], j = teams[b][y];
            const delta =
              sumTo(i, teams[b], j) + sumTo(j, teams[a], i) -
              sumTo(i, teams[a], i) - sumTo(j, teams[b], j);
            if (delta > 1e-9) {
              teams[a][x] = j; teams[b][y] = i; improved = true;
            }
          }
        }
      }
    }
    if (!improved) break;
  }

  return teams.map((t) => t.map((i) => people[i].id));
}

/** Choose the team a late arrival should join: smallest teams first, then best fit. */
export function pickTeamForLateJoiner(answers, teams /* [{id, membersAnswers: number[][]}] */) {
  if (!teams.length) return null;
  const minSize = Math.min(...teams.map((t) => t.membersAnswers.length));
  const candidates = teams.filter((t) => t.membersAnswers.length === minSize);
  let best = candidates[0], bestScore = -1;
  for (const t of candidates) {
    const score = t.membersAnswers.length
      ? t.membersAnswers.reduce((s, a) => s + similarity(answers, a), 0) / t.membersAnswers.length
      : 0;
    if (score > bestScore) { best = t; bestScore = score; }
  }
  return best.id;
}
