// Match scoring engine — pure helpers for state transitions.
import type {
  BallEvent,
  BatterStat,
  BowlerStat,
  DismissalType,
  FielderStat,
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
  const teamSize = m.teams[inn.battingTeamIndex].players.length + (m.rules.relluKattaEnabled ? 1 : 0);
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
  if (ball.extraType === "penalty") return `Penalty ${ball.extraRuns > 0 ? "+" : ""}${ball.extraRuns}`;
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
