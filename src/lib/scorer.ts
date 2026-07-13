// Match scoring engine — pure helpers for state transitions.
import type {
  BallEvent,
  BatterStat,
  BowlerStat,
  DismissalType,
  FielderStat,
  ID,
  Innings,
  Match,
} from "./types";

export const oversString = (legalBalls: number) =>
  `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;

export const totalOversAvailable = (m: Match) => m.settings.overs;

export function getCurrentInnings(m: Match): Innings {
  return m.innings[m.currentInningsIndex];
}

export function ensureBatter(inn: Innings, playerId: string): BatterStat {
  let b = inn.batters[playerId];
  if (!b) {
    b = {
      playerId,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      out: false,
      order: inn.battingOrder.length + 1,
    };
    inn.batters[playerId] = b;
    if (!inn.battingOrder.includes(playerId)) inn.battingOrder.push(playerId);
  }
  return b;
}

export function ensureBowler(inn: Innings, playerId: string): BowlerStat {
  let b = inn.bowlers[playerId];
  if (!b) {
    b = {
      playerId,
      ballsBowled: 0,
      runsConceded: 0,
      wickets: 0,
      dots: 0,
      fours: 0,
      sixes: 0,
      wides: 0,
      noBalls: 0,
      maidens: 0,
    };
    inn.bowlers[playerId] = b;
  }
  return b;
}

export function ensureFielder(inn: Innings, playerId: string): FielderStat {
  let f = inn.fielding[playerId];
  if (!f) {
    f = { playerId, catches: 0, runouts: 0, stumpings: 0 };
    inn.fielding[playerId] = f;
  }
  return f;
}

const BOWLER_CREDITED: DismissalType[] = [
  "Bowled",
  "Caught",
  "Caught And Bowled",
  "LBW",
  "Stumped",
  "Hit Wicket",
];

export function shouldCreditBowlerForWicket(t: DismissalType) {
  return BOWLER_CREDITED.includes(t);
}

export function isInningsOver(m: Match, inn: Innings): boolean {
  // Overs limit
  if (inn.legalBalls >= m.settings.overs * 6) return true;
  // All out: when wickets == players - 1, except single-person-can-bat
  const teamSize =
    m.teams[inn.battingTeamIndex].players.length + (m.rules.relluKattaEnabled ? 1 : 0);
  const maxWickets = Math.max(1, m.rules.singlePersonCanBat ? teamSize : teamSize - 1);
  if (inn.totalWickets >= maxWickets) return true;
  // Chase target reached (innings 2)
  if (m.currentInningsIndex === 1) {
    const target = m.innings[0].totalRuns + 1;
    if (inn.totalRuns >= target) return true;
  }
  return false;
}

export function computeResult(m: Match): { winnerIndex: 0 | 1 | -1; text: string } {
  const a = m.innings[0];
  const b = m.innings[1];
  if (a.totalRuns === b.totalRuns) {
    return { winnerIndex: -1, text: "Match Tied" };
  }
  if (b.totalRuns > a.totalRuns) {
    const teamSize = m.teams[b.battingTeamIndex].players.length;
    const maxWickets = Math.max(1, m.rules.singlePersonCanBat ? teamSize : teamSize - 1);
    const wktsLeft = maxWickets - b.totalWickets;
    return {
      winnerIndex: b.battingTeamIndex,
      text: `${m.teams[b.battingTeamIndex].name} won by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`,
    };
  }
  const margin = a.totalRuns - b.totalRuns;
  return {
    winnerIndex: a.battingTeamIndex,
    text: `${m.teams[a.battingTeamIndex].name} won by ${margin} run${margin === 1 ? "" : "s"}`,
  };
}

export function commentaryFor(ball: BallEvent): string {
  if (ball.wicket) {
    return `WICKET! ${ball.wicket.type}`;
  }
  if (ball.extraType === "wide") return `Wide${ball.runs ? ` + ${ball.runs}` : ""}`;
  if (ball.extraType === "noball") return `No Ball${ball.runs ? ` + ${ball.runs}` : ""}`;
  if (ball.extraType === "bye") return `Bye ${ball.runs}`;
  if (ball.extraType === "legbye") return `Leg Bye ${ball.runs}`;
  if (ball.extraType === "penalty")
    return `Penalty ${ball.extraRuns > 0 ? "+" : ""}${ball.extraRuns}`;
  if (ball.runs === 6) return "SIX!";
  if (ball.runs === 4) return "FOUR!";
  if (ball.runs === 0) return "Dot";
  return `${ball.runs} run${ball.runs === 1 ? "" : "s"}`;
}

export function ballShortLabel(ball: BallEvent): string {
  if (ball.wicket) return "W";
  if (ball.extraType === "wide") return `Wd${ball.runs ? "+" + ball.runs : ""}`;
  if (ball.extraType === "noball") return `Nb${ball.runs ? "+" + ball.runs : ""}`;
  if (ball.extraType === "bye") return `b${ball.runs}`;
  if (ball.extraType === "legbye") return `lb${ball.runs}`;
  if (ball.extraType === "penalty") return `P${ball.extraRuns}`;
  return String(ball.runs);
}

// Auto-pick Man of the Match using a weighted cricket impact score.
// Preference: winning team players (unless tie). Batting + bowling + fielding contributions.
export function pickManOfTheMatch(
  m: Match,
): { playerId: ID; teamIndex: 0 | 1; score: number } | null {
  if (m.status !== "completed" && !m.resultText) return null;
  const winner = m.winnerIndex;
  const scores: { playerId: ID; teamIndex: 0 | 1; score: number }[] = [];

  for (let ti = 0; ti < 2; ti++) {
    const teamIndex = ti as 0 | 1;
    const team = m.teams[teamIndex];
    for (const p of team.players) {
      let s = 0;
      // Batting: runs count 1:1, boundaries add small bonus, strike-rate bonus over 100 (min 6 balls)
      const batInn = m.innings.find((inn) => inn.battingTeamIndex === teamIndex);
      if (batInn) {
        const b = batInn.batters[p.id];
        if (b) {
          s += b.runs;
          s += b.fours * 1;
          s += b.sixes * 2;
          if (b.balls >= 6) {
            const sr = (b.runs / b.balls) * 100;
            s += (sr - 100) / 5; // +/- based on strike rate
          }
          if (!b.out && b.balls > 0) s += 5; // not-out bonus
        }
      }
      // Bowling: wickets heavy, dots small, econ bonus/penalty (min 12 balls)
      const bowlInn = m.innings.find((inn) => inn.bowlingTeamIndex === teamIndex);
      if (bowlInn) {
        const bw = bowlInn.bowlers[p.id];
        if (bw) {
          s += bw.wickets * 25;
          s += bw.dots * 1;
          s += bw.maidens * 5;
          if (bw.ballsBowled >= 12) {
            const econ = (bw.runsConceded / bw.ballsBowled) * 6;
            s += (7 - econ) * 3; // reward economy under 7
          }
          s -= bw.runsConceded * 0.3;
        }
      }
      // Fielding (in either innings the player fielded)
      for (const inn of m.innings) {
        const f = inn.fielding[p.id];
        if (!f) continue;
        s += f.catches * 10;
        s += f.runouts * 8;
        s += f.stumpings * 12;
      }
      // Winning team bonus
      if (winner === teamIndex) s += 15;
      scores.push({ playerId: p.id, teamIndex, score: s });
    }
  }

  if (scores.length === 0) return null;
  scores.sort((a, b) => {
    // Prefer winning team on ties in score
    if (b.score !== a.score) return b.score - a.score;
    if (winner !== undefined && winner !== -1) {
      if (a.teamIndex === winner && b.teamIndex !== winner) return -1;
      if (b.teamIndex === winner && a.teamIndex !== winner) return 1;
    }
    return 0;
  });
  const top = scores[0];
  if (top.score <= 0) return null;
  return top;
}
