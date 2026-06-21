// Domain types for Gully Cricket Scorer.

export type ID = string;

export interface Player {
  id: ID;
  name: string;
  photo?: string; // dataURL
}

export interface SavedTeam {
  id: ID;
  name: string;
  players: Player[];
  createdAt: number;
  updatedAt: number;
}

export interface MatchSettings {
  overs: number; // 1..100
  players: number; // 1..15
  series: number; // 1..10
  matchIndexInSeries: number; // 1-based
  seriesId?: ID;
}

export interface MatchRules {
  wideRuns: number; // 0..5
  noBallRuns: number; // 0..5
  freeHitAfterNoBall: boolean;
  miniCheck: boolean;
  overLimit: number | null; // null = unlimited; 1..100
  tipAndRun: boolean;
  oneHandOneBounce: boolean;
  lastBallFreeHit: boolean;
  nonStriker: boolean;
  retiredCanReturn: boolean;
  singlePersonCanBat: boolean;
  relluKattaEnabled: boolean;
  relluKattaName?: string;
}

export type DismissalType =
  | "Bowled"
  | "Caught"
  | "Caught And Bowled"
  | "LBW"
  | "Run Out"
  | "Stumped"
  | "Hit Wicket"
  | "Obstructing the Field"
  | "Hit the Ball Twice"
  | "Timed Out";

export interface Wicket {
  type: DismissalType;
  outBatsmanId: ID;
  fielderId?: ID; // catcher / runout fielder / stumper (= wicketkeeper)
  oneHandOneBounce?: boolean;
}

export interface BallEvent {
  id: ID;
  // Score increments
  runs: number; // runs off the bat (not extras)
  extraRuns: number; // runs from the extra itself (e.g. wide=1, plus optional extras)
  extraType?: "wide" | "noball" | "bye" | "legbye" | "penalty";
  isLegal: boolean; // counts toward over balls?
  isFreeHit: boolean;
  wicket?: Wicket;
  batsmanOnStrike: ID;
  nonStriker?: ID;
  bowlerId: ID;
  overNumber: number; // 0-based
  ballInOver: number; // 1-based, only legal balls
  commentary: string;
  // For undo
  swapEnds: boolean;
}

export interface BatterStat {
  playerId: ID;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  dismissal?: string;
  retired?: boolean;
  order: number;
}

export interface BowlerStat {
  playerId: ID;
  ballsBowled: number; // legal balls
  runsConceded: number;
  wickets: number;
  dots: number;
  fours: number;
  sixes: number;
  wides: number;
  noBalls: number;
  maidens: number;
  // mini-check: balls bowled within current spell of this over
  miniCheckBallsInOver?: number;
  miniCheckFull?: boolean;
}

export interface FielderStat {
  playerId: ID;
  catches: number;
  runouts: number;
  stumpings: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  runs: number;
  overs: string; // e.g. "4.2"
  batsmanOutId: ID;
}

export interface Innings {
  battingTeamIndex: 0 | 1;
  bowlingTeamIndex: 0 | 1;
  balls: BallEvent[];
  batters: Record<ID, BatterStat>;
  bowlers: Record<ID, BowlerStat>;
  fielding: Record<ID, FielderStat>;
  fallOfWickets: FallOfWicket[];
  extras: { wides: number; noBalls: number; byes: number; legByes: number; penalty: number };
  battingOrder: ID[]; // appended as players come in
  currentStrikerId?: ID;
  currentNonStrikerId?: ID;
  currentBowlerId?: ID;
  previousBowlerId?: ID;
  bowlerPromptMode?: "nextOver" | "replacement" | "miniCheck";
  excludedBowlerIdForPrompt?: ID;
  totalRuns: number;
  totalWickets: number;
  legalBalls: number; // total legal balls bowled in innings
  freeHitNext: boolean;
  // mini-check state for current over
  miniCheckThisOver?: boolean;
  miniCheckPending?: boolean;
  miniCheckBowlerId?: ID;
  // bowler attribution within a single over for mini-check spells
  oversBowledByBowlerHistory: { bowlerId: ID; legalBalls: number }[];
  // tracks bowler overs (to enforce over limit)
  bowlerOverCount: Record<ID, number>;
  done: boolean;
  // who is the wicketkeeper for the bowling team currently
  wicketkeeperId?: ID;
  // captain stored for reference
  captainId?: ID;
}

export interface TeamSquad {
  // snapshot used during match
  sourceTeamId?: ID; // if linked to a saved team
  name: string;
  players: Player[];
  captainId?: ID;
  wicketkeeperId?: ID;
}

export type MatchStatus = "in_progress" | "completed" | "quit";

export interface Match {
  id: ID;
  createdAt: number;
  updatedAt: number;
  status: MatchStatus;
  settings: MatchSettings;
  rules: MatchRules;
  teams: [TeamSquad, TeamSquad];
  toss?: { winnerIndex: 0 | 1; decision: "bat" | "bowl" };
  battingFirstIndex?: 0 | 1;
  innings: [Innings, Innings];
  currentInningsIndex: 0 | 1;
  // result
  winnerIndex?: 0 | 1 | -1; // -1 = tie
  resultText?: string;
  manOfTheMatchId?: ID;
  manOfTheMatchTeamIndex?: 0 | 1;
  // Rellu Katta runtime state
  rk?: { currentBattingTeam?: 0 | 1; currentBowlingTeam?: 0 | 1 };
  needsRules?: boolean;
}

export interface AggregateStats {
  byPlayer: Record<
    ID,
    {
      name: string;
      matches: number;
      innings: number;
      runs: number;
      ballsFaced: number;
      notOuts: number;
      fours: number;
      sixes: number;
      highScore: number;
      // bowling
      bowlInnings: number;
      ballsBowled: number;
      runsConceded: number;
      wickets: number;
      dotBalls: number;
      // fielding
      catches: number;
      runouts: number;
      stumpings: number;
    }
  >;
  byTeam: Record<
    string,
    {
      name: string;
      matches: number;
      wins: number;
      losses: number;
      ties: number;
    }
  >;
}
