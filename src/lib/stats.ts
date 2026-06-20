// Aggregate cross-match stats for the Stats screen.
import type { AggregateStats, ID, Match, Player } from "./types";

function findPlayer(m: Match, id: ID): Player | undefined {
  for (const t of m.teams) {
    const p = t.players.find((x) => x.id === id);
    if (p) return p;
  }
  return undefined;
}

export function aggregateStats(matches: Match[]): AggregateStats {
  const byPlayer: AggregateStats["byPlayer"] = {};
  const byTeam: AggregateStats["byTeam"] = {};

  const ensureP = (id: ID, name: string) => {
    if (!byPlayer[id]) {
      byPlayer[id] = {
        name, matches: 0, innings: 0, runs: 0, ballsFaced: 0, notOuts: 0, fours: 0, sixes: 0, highScore: 0,
        bowlInnings: 0, ballsBowled: 0, runsConceded: 0, wickets: 0, dotBalls: 0,
        catches: 0, runouts: 0, stumpings: 0,
      };
    }
    return byPlayer[id];
  };
  const ensureT = (name: string) => {
    if (!byTeam[name]) byTeam[name] = { name, matches: 0, wins: 0, losses: 0, ties: 0 };
    return byTeam[name];
  };

  for (const m of matches) {
    if (m.status !== "completed") continue;
    const t1 = ensureT(m.teams[0].name);
    const t2 = ensureT(m.teams[1].name);
    t1.matches += 1; t2.matches += 1;
    if (m.winnerIndex === -1) { t1.ties += 1; t2.ties += 1; }
    else if (m.winnerIndex === 0) { t1.wins += 1; t2.losses += 1; }
    else if (m.winnerIndex === 1) { t2.wins += 1; t1.losses += 1; }

    const seen = new Set<ID>();
    for (let ii = 0; ii < 2; ii++) {
      const inn = m.innings[ii];
      for (const id of inn.battingOrder) {
        const p = findPlayer(m, id); if (!p) continue;
        const s = ensureP(p.id, p.name);
        s.innings += 1;
        const b = inn.batters[id];
        s.runs += b.runs;
        s.ballsFaced += b.balls;
        s.fours += b.fours;
        s.sixes += b.sixes;
        if (!b.out) s.notOuts += 1;
        if (b.runs > s.highScore) s.highScore = b.runs;
        seen.add(id);
      }
      for (const id of Object.keys(inn.bowlers)) {
        const p = findPlayer(m, id); if (!p) continue;
        const s = ensureP(p.id, p.name);
        const b = inn.bowlers[id];
        s.bowlInnings += 1;
        s.ballsBowled += b.ballsBowled;
        s.runsConceded += b.runsConceded;
        s.wickets += b.wickets;
        s.dotBalls += b.dots;
        seen.add(id);
      }
      for (const id of Object.keys(inn.fielding)) {
        const p = findPlayer(m, id); if (!p) continue;
        const s = ensureP(p.id, p.name);
        const f = inn.fielding[id];
        s.catches += f.catches;
        s.runouts += f.runouts;
        s.stumpings += f.stumpings;
        seen.add(id);
      }
    }
    for (const id of seen) {
      const p = findPlayer(m, id); if (!p) continue;
      ensureP(p.id, p.name).matches += 1;
    }
  }
  return { byPlayer, byTeam };
}

export function leaderboards(agg: AggregateStats) {
  const players = Object.values(agg.byPlayer);
  const top = (sel: (p: AggregateStats["byPlayer"][string]) => number, filter?: (p: AggregateStats["byPlayer"][string]) => boolean) =>
    [...players].filter(filter ?? (() => true)).sort((a, b) => sel(b) - sel(a)).slice(0, 10);
  const teams = Object.values(agg.byTeam);

  return {
    orangeCap: top((p) => p.runs),
    superStriker: top((p) => p.ballsFaced > 0 ? (p.runs / p.ballsFaced) * 100 : 0, (p) => p.ballsFaced >= 6).map(p => ({ ...p, strikeRate: p.ballsFaced > 0 ? (p.runs / p.ballsFaced) * 100 : 0 })),
    averageGod: top((p) => {
      const outs = p.innings - p.notOuts;
      return outs > 0 ? p.runs / outs : p.runs;
    }, (p) => p.innings >= 2).map(p => {
      const outs = p.innings - p.notOuts;
      return { ...p, average: outs > 0 ? p.runs / outs : p.runs };
    }),
    fourBoss: top((p) => p.fours),
    sixKing: top((p) => p.sixes),
    purpleCap: top((p) => p.wickets),
    economicalBlazer: top((p) => -((p.runsConceded / Math.max(p.ballsBowled, 1)) * 6), (p) => p.ballsBowled >= 12).map(p => ({ ...p, econ: (p.runsConceded / Math.max(p.ballsBowled, 1)) * 6 })),
    wicketHunter: top((p) => -(p.ballsBowled / Math.max(p.wickets, 1)), (p) => p.wickets >= 1).map(p => ({ ...p, sr: p.ballsBowled / Math.max(p.wickets, 1) })),
    averageKing: top((p) => -(p.runsConceded / Math.max(p.wickets, 1)), (p) => p.wickets >= 1).map(p => ({ ...p, avg: p.runsConceded / Math.max(p.wickets, 1) })),
    dotDominator: top((p) => p.dotBalls),
    catchExpert: top((p) => p.catches),
    gunshotThrow: top((p) => p.runouts),
    fieryHands: top((p) => p.stumpings),
    mostWins: [...teams].sort((a, b) => b.wins - a.wins).slice(0, 10),
    mostMatches: [...teams].sort((a, b) => b.matches - a.matches).slice(0, 10),
    bestWL: [...teams].filter(t => t.losses > 0 || t.wins > 0).sort((a, b) => (b.wins / Math.max(b.losses, 1)) - (a.wins / Math.max(a.losses, 1))).slice(0, 10).map(t => ({ ...t, ratio: t.wins / Math.max(t.losses, 1) })),
  };
}
