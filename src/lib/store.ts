// Global state — local-first, persisted to localStorage.
import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { storage } from "./storage";
import {
  ballShortLabel,
  commentaryFor,
  computeResult,
  ensureBatter,
  ensureBowler,
  ensureFielder,
  getCurrentInnings,
  isInningsOver,
  oversString,
  pickManOfTheMatch,
  shouldCreditBowlerForWicket,
} from "./scorer";
import type {
  BallEvent,
  ID,
  Innings,
  Match,
  MatchRules,
  MatchSettings,
  Player,
  SavedTeam,
  TeamSquad,
  Wicket,
} from "./types";

export const DEFAULT_RULES: MatchRules = {
  wideRuns: 1,
  noBallRuns: 1,
  freeHitAfterNoBall: false,
  miniCheck: false,
  overLimit: null,
  tipAndRun: false,
  oneHandOneBounce: false,
  lastBallFreeHit: false,
  nonStriker: true,
  retiredCanReturn: true,
  singlePersonCanBat: false,
  relluKattaEnabled: false,
};

function emptyInnings(battingIdx: 0 | 1): Innings {
  return {
    battingTeamIndex: battingIdx,
    bowlingTeamIndex: (battingIdx === 0 ? 1 : 0) as 0 | 1,
    balls: [],
    batters: {},
    bowlers: {},
    fielding: {},
    fallOfWickets: [],
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
    battingOrder: [],
    totalRuns: 0,
    totalWickets: 0,
    legalBalls: 0,
    freeHitNext: false,
    oversBowledByBowlerHistory: [],
    bowlerOverCount: {},
    done: false,
  };
}

interface AppState {
  teams: SavedTeam[];
  matches: Match[];
  activeMatchId: string | null;
  hydrated: boolean;
  syncStatus: "guest" | "idle" | "syncing" | "offline" | "error";
  syncMessage: string | null;

  hydrate: () => void;
  replaceLocalData: (input: {
    teams: SavedTeam[];
    matches: Match[];
    activeMatchId: string | null;
    clientUpdatedAt?: number;
  }) => void;
  markSynced: (status?: AppState["syncStatus"], message?: string | null) => void;

  // Teams CRUD
  upsertTeam: (t: SavedTeam) => void;
  deleteTeam: (id: ID) => void;

  // Match lifecycle
  createMatch: (input: {
    settings: MatchSettings;
    teams: [TeamSquad, TeamSquad];
    rules: MatchRules;
    quick?: boolean;
  }) => Match;
  updateMatch: (m: Match) => void;
  deleteMatch: (id: ID) => void;
  setActive: (id: ID | null) => void;

  // Scoring actions (mutate active match)
  setToss: (winnerIndex: 0 | 1, decision: "bat" | "bowl") => void;
  setOpeners: (
    strikerId: ID,
    nonStrikerId: ID | undefined,
    bowlerId: ID,
    wicketkeeperId: ID,
  ) => void;
  recordBall: (input: RecordBallInput) => void;
  undoLastBall: () => void;
  swapStrike: () => void;
  retireBatsman: (retiringId: ID, replacementId?: ID) => void;
  changeWicketkeeper: (newKeeperId: ID) => void;
  setNextBowler: (bowlerId: ID, miniCheck: boolean) => void;
  selectNewBatsman: (playerId: ID) => void;
  dismissOver: (keepChanges: boolean) => void;
  setMiniCheckFull: () => void;
  setNonStrikerEnabled: (enabled: boolean, nonStrikerId?: ID) => void;
  startSecondInnings: (
    strikerId: ID,
    nonStrikerId: ID | undefined,
    bowlerId: ID,
    wicketkeeperId: ID,
  ) => void;
  finishMatch: (manOfTheMatchId?: ID, manOfTheMatchTeamIndex?: 0 | 1) => void;
  quitMatch: () => void;
  resumeMatch: (id: ID) => void;
  setRelluKattaSide: (battingTeam?: 0 | 1, bowlingTeam?: 0 | 1) => void;
}

export interface RecordBallInput {
  type: "run" | "wide" | "noball" | "bye" | "legbye" | "penalty" | "wicket";
  runs?: number; // off the bat OR additional with wide/noball OR bye/legbye amount OR penalty amount
  wicket?: Wicket;
  miniCheckPrompt?: boolean;
}

function persist(get: () => AppState) {
  const s = get();
  storage.setTeams(s.teams);
  storage.setMatches(s.matches);
  storage.setActiveMatchId(s.activeMatchId);
  storage.markClientUpdated();
}

function activeMatch(s: AppState): Match | null {
  if (!s.activeMatchId) return null;
  return s.matches.find((m) => m.id === s.activeMatchId) ?? null;
}

function cloneMatch(m: Match): Match {
  return typeof structuredClone === "function" ? structuredClone(m) : JSON.parse(JSON.stringify(m));
}

type ZustandSet = (
  partial: Partial<AppState> | ((state: AppState) => Partial<AppState> | AppState),
) => void;

function withActive(set: ZustandSet, get: () => AppState, fn: (m: Match) => void) {
  set((s: AppState) => {
    const current = activeMatch(s);
    if (!current) return s;
    const nextMatch = cloneMatch(current);
    fn(nextMatch);
    nextMatch.updatedAt = Date.now();
    return { matches: s.matches.map((m) => (m.id === nextMatch.id ? nextMatch : m)) };
  });
  persist(get);
}

export const useApp = create<AppState>((set, get) => ({
  teams: [],
  matches: [],
  activeMatchId: null,
  hydrated: false,
  syncStatus: "guest",
  syncMessage: null,

  hydrate: () => {
    if (get().hydrated) return;
    const matches = storage.getMatches().map((m) => {
      const missingCaptains =
        !m.teams[0].captainId ||
        !m.teams[1].captainId ||
        !m.teams[0].wicketkeeperId ||
        !m.teams[1].wicketkeeperId;
      return m.status === "in_progress" && !m.toss && missingCaptains
        ? { ...m, needsRules: true }
        : m;
    });
    set({
      teams: storage.getTeams(),
      matches,
      activeMatchId: storage.getActiveMatchId(),
      hydrated: true,
    });
  },

  replaceLocalData: ({ teams, matches, activeMatchId, clientUpdatedAt }) => {
    set({ teams, matches, activeMatchId, hydrated: true });
    storage.setTeams(teams);
    storage.setMatches(matches);
    storage.setActiveMatchId(activeMatchId);
    storage.setClientUpdatedAt(clientUpdatedAt ?? Date.now());
  },

  markSynced: (status = "idle", message = null) =>
    set({ syncStatus: status, syncMessage: message }),

  upsertTeam: (t) => {
    set((s) => {
      const exists = s.teams.find((x) => x.id === t.id);
      const next = exists
        ? s.teams.map((x) => (x.id === t.id ? { ...t, updatedAt: Date.now() } : x))
        : [...s.teams, { ...t, createdAt: Date.now(), updatedAt: Date.now() }];
      return { teams: next };
    });
    persist(get);
  },

  deleteTeam: (id) => {
    set((s) => ({ teams: s.teams.filter((t) => t.id !== id) }));
    persist(get);
  },

  createMatch: ({ settings, teams, rules, quick }) => {
    const id = uuid();
    const m: Match = {
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "in_progress",
      settings,
      rules,
      needsRules: true,
      teams,
      innings: [emptyInnings(0), emptyInnings(1)],
      currentInningsIndex: 0,
      quick: quick || undefined,
    };
    set((s) => ({ matches: [...s.matches, m], activeMatchId: id }));
    persist(get);
    return m;
  },

  updateMatch: (m) => {
    set((s) => ({
      matches: s.matches.map((x) => (x.id === m.id ? { ...m, updatedAt: Date.now() } : x)),
    }));
    persist(get);
  },

  deleteMatch: (id) => {
    set((s) => ({
      matches: s.matches.filter((m) => m.id !== id),
      activeMatchId: s.activeMatchId === id ? null : s.activeMatchId,
    }));
    persist(get);
  },

  setActive: (id) => {
    set({ activeMatchId: id });
    persist(get);
  },

  setToss: (winnerIndex, decision) => {
    withActive(set, get, (m) => {
      m.toss = { winnerIndex, decision };
      m.needsRules = false;
      const battingFirst: 0 | 1 =
        decision === "bat" ? winnerIndex : ((winnerIndex === 0 ? 1 : 0) as 0 | 1);
      m.battingFirstIndex = battingFirst;
      m.innings[0] = emptyInnings(battingFirst);
      m.innings[1] = emptyInnings((battingFirst === 0 ? 1 : 0) as 0 | 1);
      m.currentInningsIndex = 0;
      if (m.quick) autoFillOpeners(m, 0);
    });
  },

  setOpeners: (strikerId, nonStrikerId, bowlerId, wicketkeeperId) => {
    withActive(set, get, (m) => {
      const inn = m.innings[0];
      inn.currentStrikerId = strikerId;
      inn.currentNonStrikerId = m.rules.nonStriker ? nonStrikerId : undefined;
      inn.currentBowlerId = bowlerId;
      inn.wicketkeeperId = wicketkeeperId;
      ensureBatter(inn, strikerId);
      if (m.rules.nonStriker && nonStrikerId) ensureBatter(inn, nonStrikerId);
      ensureBowler(inn, bowlerId);
      // last-ball free hit may apply to ball 6 of an over (handled at record-time)
      if (m.rules.lastBallFreeHit && inn.legalBalls % 6 === 5) inn.freeHitNext = true;
    });
  },

  recordBall: ({ type, runs = 0, wicket }) => {
    withActive(set, get, (m) => {
      const inn = getCurrentInnings(m);
      if (m.status !== "in_progress" || inn.done) return;
      if (!inn.currentStrikerId || !inn.currentBowlerId) return;
      const bowlerId = inn.currentBowlerId;
      const strikerId = inn.currentStrikerId;
      const isFreeHit = inn.freeHitNext;
      const ball: BallEvent = {
        id: uuid(),
        runs: 0,
        extraRuns: 0,
        isLegal: true,
        isFreeHit,
        batsmanOnStrike: strikerId,
        nonStriker: inn.currentNonStrikerId,
        bowlerId,
        overNumber: Math.floor(inn.legalBalls / 6),
        ballInOver: (inn.legalBalls % 6) + 1,
        commentary: "",
        swapEnds: false,
      };
      const batter = ensureBatter(inn, strikerId);
      const bowler = ensureBowler(inn, bowlerId);

      const wideRunsBase = m.rules.wideRuns;
      const nbRunsBase = m.rules.noBallRuns;

      switch (type) {
        case "run": {
          ball.runs = runs;
          batter.runs += runs;
          batter.balls += 1;
          if (runs === 4) batter.fours += 1;
          if (runs === 6) batter.sixes += 1;
          bowler.runsConceded += runs;
          if (runs === 4) bowler.fours += 1;
          if (runs === 6) bowler.sixes += 1;
          if (runs === 0) bowler.dots += 1;
          if (runs % 2 === 1) ball.swapEnds = true;
          inn.totalRuns += runs;
          break;
        }
        case "wide": {
          ball.isLegal = false;
          ball.extraType = "wide";
          ball.extraRuns = wideRunsBase + runs;
          inn.extras.wides += ball.extraRuns;
          bowler.runsConceded += ball.extraRuns;
          bowler.wides += 1;
          inn.totalRuns += ball.extraRuns;
          ball.runs = runs;
          if (runs % 2 === 1) ball.swapEnds = true;
          break;
        }
        case "noball": {
          ball.isLegal = false;
          ball.extraType = "noball";
          ball.extraRuns = nbRunsBase;
          inn.extras.noBalls += ball.extraRuns;
          bowler.runsConceded += ball.extraRuns + runs;
          bowler.noBalls += 1;
          inn.totalRuns += ball.extraRuns + runs;
          ball.runs = runs;
          batter.balls += 1; // count ball faced
          batter.runs += runs;
          if (runs === 4) {
            batter.fours += 1;
            bowler.fours += 1;
          }
          if (runs === 6) {
            batter.sixes += 1;
            bowler.sixes += 1;
          }
          if (runs % 2 === 1) ball.swapEnds = true;
          if (m.rules.freeHitAfterNoBall) inn.freeHitNext = true;
          break;
        }
        case "bye": {
          ball.extraType = "bye";
          ball.extraRuns = runs;
          inn.extras.byes += runs;
          inn.totalRuns += runs;
          ball.runs = runs;
          batter.balls += 1;
          if (runs % 2 === 1) ball.swapEnds = true;
          break;
        }
        case "legbye": {
          ball.extraType = "legbye";
          ball.extraRuns = runs;
          inn.extras.legByes += runs;
          inn.totalRuns += runs;
          ball.runs = runs;
          batter.balls += 1;
          if (runs % 2 === 1) ball.swapEnds = true;
          break;
        }
        case "penalty": {
          ball.isLegal = false;
          ball.extraType = "penalty";
          ball.extraRuns = runs;
          inn.extras.penalty += runs;
          inn.totalRuns += runs;
          break;
        }
        case "wicket": {
          // plain wicket off the bat (Bowled, LBW, etc) — runs default 0
          batter.balls += 1;
          if (runs === 0) bowler.dots += 1;
          break;
        }
      }

      // Apply wicket if any
      if (wicket) {
        ball.wicket = wicket;
        // On free hit, only run-out (and certain rule-based) dismissals count.
        // For gully simplicity: if it's a free hit and dismissal isn't Run Out / Obstructing / Hit Ball Twice, treat as no wicket.
        const allowedOnFH = [
          "Run Out",
          "Obstructing the Field",
          "Hit the Ball Twice",
          "Hit Wicket",
          "Stumped",
        ];
        const counts = !isFreeHit || allowedOnFH.includes(wicket.type);
        if (counts) {
          inn.totalWickets += 1;
          const out = ensureBatter(inn, wicket.outBatsmanId);
          out.out = true;
          out.dismissal = formatDismissal(m, wicket);
          inn.fallOfWickets.push({
            wicketNumber: inn.totalWickets,
            runs: inn.totalRuns,
            overs: oversString(inn.legalBalls + (ball.isLegal ? 1 : 0)),
            batsmanOutId: wicket.outBatsmanId,
          });
          if (shouldCreditBowlerForWicket(wicket.type)) bowler.wickets += 1;
          if (wicket.type === "Caught" || wicket.type === "Caught And Bowled") {
            if (wicket.fielderId) ensureFielder(inn, wicket.fielderId).catches += 1;
          }
          if (wicket.type === "Run Out" && wicket.fielderId)
            ensureFielder(inn, wicket.fielderId).runouts += 1;
          if (wicket.type === "Stumped" && inn.wicketkeeperId)
            ensureFielder(inn, inn.wicketkeeperId).stumpings += 1;
          // remove the out batsman from crease
          if (inn.currentStrikerId === wicket.outBatsmanId) inn.currentStrikerId = undefined;
          if (inn.currentNonStrikerId === wicket.outBatsmanId) inn.currentNonStrikerId = undefined;
        } else {
          ball.commentary = "FREE HIT — not out";
        }
      }

      // legal-ball housekeeping
      if (ball.isLegal) {
        inn.legalBalls += 1;
        bowler.ballsBowled += 1;
        // free hit consumed on a legal ball
        if (isFreeHit) inn.freeHitNext = false;
        // mini-check tracking
        const lastSpell = inn.oversBowledByBowlerHistory[inn.oversBowledByBowlerHistory.length - 1];
        if (lastSpell && lastSpell.bowlerId === bowlerId) {
          lastSpell.legalBalls += 1;
        } else {
          inn.oversBowledByBowlerHistory.push({ bowlerId, legalBalls: 1 });
        }
      }

      ball.commentary = ball.commentary || commentaryFor(ball);
      inn.balls.push(ball);

      // swap on odd runs
      if (ball.swapEnds && inn.currentStrikerId && inn.currentNonStrikerId) {
        const t = inn.currentStrikerId;
        inn.currentStrikerId = inn.currentNonStrikerId;
        inn.currentNonStrikerId = t;
      }

      // Last-ball free hit (next ball) — if the upcoming ball is the 6th of an over
      if (m.rules.lastBallFreeHit && inn.legalBalls > 0 && inn.legalBalls % 6 === 5) {
        inn.freeHitNext = true;
      }

      // End of over?
      if (ball.isLegal && inn.legalBalls > 0 && inn.legalBalls % 6 === 0) {
        // swap strikers
        if (inn.currentStrikerId && inn.currentNonStrikerId) {
          const t = inn.currentStrikerId;
          inn.currentStrikerId = inn.currentNonStrikerId;
          inn.currentNonStrikerId = t;
        }
        inn.bowlerOverCount[bowlerId] = (inn.bowlerOverCount[bowlerId] ?? 0) + 1;
        inn.previousBowlerId = bowlerId;
        inn.currentBowlerId = undefined; // prompt for next bowler
        inn.miniCheckThisOver = false;
        inn.miniCheckPending = false;
        inn.miniCheckBowlerId = undefined;
        inn.bowlerPromptMode = "nextOver";
        inn.excludedBowlerIdForPrompt = undefined;
      } else if (
        ball.isLegal &&
        inn.miniCheckThisOver &&
        !inn.miniCheckPending &&
        inn.legalBalls % 6 === 3
      ) {
        inn.miniCheckPending = true;
        inn.miniCheckBowlerId = bowlerId;
        inn.currentBowlerId = undefined;
        inn.bowlerPromptMode = "miniCheck";
        inn.excludedBowlerIdForPrompt = bowlerId;
      }

      // Innings end check
      if (isInningsOver(m, inn)) {
        inn.done = true;
        if (m.currentInningsIndex === 1) {
          // match end
          const r = computeResult(m);
          m.winnerIndex = r.winnerIndex;
          m.resultText = r.text;
          m.status = "completed";
          if (!m.manOfTheMatchId) {
            const mom = pickManOfTheMatch(m);
            if (mom) {
              m.manOfTheMatchId = mom.playerId;
              m.manOfTheMatchTeamIndex = mom.teamIndex;
            }
          }
        } else {
          m.currentInningsIndex = 1;
        }
      }
    });
  },

  undoLastBall: () => {
    withActive(set, get, (m) => {
      if (m.status === "completed") {
        m.status = "in_progress";
        m.winnerIndex = undefined;
        m.resultText = undefined;
      }
      if (m.currentInningsIndex === 1 && m.innings[1].balls.length === 0 && m.innings[0].done) {
        m.currentInningsIndex = 0;
        m.innings[0].done = false;
      }
      const inn = getCurrentInnings(m);
      const last = inn.balls.pop();
      if (!last) return;
      // Naive but safe: rebuild from scratch is expensive, instead recompute innings from kept balls.
      const kept = inn.balls;
      rebuildInnings(m, inn, kept);
      inn.currentStrikerId = last.batsmanOnStrike;
      inn.currentNonStrikerId = last.nonStriker;
      inn.currentBowlerId = last.bowlerId;
      inn.freeHitNext = last.isFreeHit;
      inn.bowlerPromptMode = undefined;
      inn.excludedBowlerIdForPrompt = undefined;
      inn.miniCheckPending = false;
      inn.miniCheckBowlerId = undefined;
      ensureBatter(inn, last.batsmanOnStrike);
      if (last.nonStriker) ensureBatter(inn, last.nonStriker);
      ensureBowler(inn, last.bowlerId);
    });
  },

  swapStrike: () => {
    withActive(set, get, (m) => {
      const inn = getCurrentInnings(m);
      if (inn.currentStrikerId && inn.currentNonStrikerId) {
        const t = inn.currentStrikerId;
        inn.currentStrikerId = inn.currentNonStrikerId;
        inn.currentNonStrikerId = t;
      }
    });
  },

  retireBatsman: (retiringId, replacementId) => {
    withActive(set, get, (m) => {
      const inn = getCurrentInnings(m);
      if (retiringId !== inn.currentStrikerId && retiringId !== inn.currentNonStrikerId) return;
      const b = ensureBatter(inn, retiringId);
      b.retired = true;
      b.out = false;
      b.dismissal = "retired";
      if (replacementId) ensureBatter(inn, replacementId);
      if (inn.currentStrikerId === retiringId) inn.currentStrikerId = replacementId;
      if (inn.currentNonStrikerId === retiringId)
        inn.currentNonStrikerId = m.rules.nonStriker ? replacementId : undefined;
    });
  },

  changeWicketkeeper: (newKeeperId) => {
    withActive(set, get, (m) => {
      getCurrentInnings(m).wicketkeeperId = newKeeperId;
    });
  },

  setNextBowler: (bowlerId, miniCheck) => {
    withActive(set, get, (m) => {
      const inn = getCurrentInnings(m);
      inn.currentBowlerId = bowlerId;
      inn.miniCheckThisOver = miniCheck;
      inn.miniCheckPending = false;
      inn.miniCheckBowlerId = undefined;
      inn.bowlerPromptMode = undefined;
      inn.excludedBowlerIdForPrompt = undefined;
      ensureBowler(inn, bowlerId);
    });
  },

  selectNewBatsman: (playerId) => {
    withActive(set, get, (m) => {
      const inn = getCurrentInnings(m);
      ensureBatter(inn, playerId);
      if (!inn.currentStrikerId) inn.currentStrikerId = playerId;
      else if (m.rules.nonStriker && !inn.currentNonStrikerId) inn.currentNonStrikerId = playerId;
      if (playerId === "__rk__" && inn.currentBowlerId === "__rk__") {
        inn.currentBowlerId = undefined;
        inn.bowlerPromptMode = "replacement";
        inn.excludedBowlerIdForPrompt = "__rk__";
      }
    });
  },

  dismissOver: (keepChanges) => {
    withActive(set, get, (m) => {
      const inn = getCurrentInnings(m);
      if (keepChanges) {
        const currentBowlerId = inn.currentBowlerId;
        const currentOverIdx = Math.floor(inn.legalBalls / 6);
        inn.balls.forEach((b) => {
          if (b.overNumber === currentOverIdx) {
            b.isLegal = false;
            b.ballInOver = 0;
          }
        });
        rebuildInnings(m, inn, inn.balls);
        inn.currentBowlerId = undefined;
        inn.bowlerPromptMode = "replacement";
        inn.excludedBowlerIdForPrompt = currentBowlerId;
        inn.miniCheckThisOver = false;
        inn.miniCheckPending = false;
        inn.miniCheckBowlerId = undefined;
        return;
      }
      const currentBowlerId = inn.currentBowlerId;
      const currentOverIdx = Math.floor(inn.legalBalls / 6);
      const filtered = inn.balls.filter((b) => b.overNumber < currentOverIdx);
      rebuildInnings(m, inn, filtered);
      inn.currentBowlerId = undefined;
      inn.bowlerPromptMode = "replacement";
      inn.excludedBowlerIdForPrompt = currentBowlerId;
      inn.miniCheckThisOver = false;
      inn.miniCheckPending = false;
      inn.miniCheckBowlerId = undefined;
    });
  },

  setNonStrikerEnabled: (enabled, nonStrikerId) => {
    withActive(set, get, (m) => {
      const inn = getCurrentInnings(m);
      m.rules.nonStriker = enabled;
      m.rules.singlePersonCanBat = !enabled;
      if (!enabled) {
        if (!inn.currentStrikerId && inn.currentNonStrikerId) {
          inn.currentStrikerId = inn.currentNonStrikerId;
        } else if (inn.currentNonStrikerId) {
          const b = ensureBatter(inn, inn.currentNonStrikerId);
          b.retired = true;
          b.dismissal = "retired";
        }
        inn.currentNonStrikerId = undefined;
      } else if (nonStrikerId && nonStrikerId !== inn.currentStrikerId) {
        ensureBatter(inn, nonStrikerId);
        inn.currentNonStrikerId = nonStrikerId;
      }
    });
  },

  setMiniCheckFull: () => {
    withActive(set, get, (m) => {
      const inn = getCurrentInnings(m);
      inn.currentBowlerId = inn.miniCheckBowlerId;
      inn.miniCheckThisOver = false;
      inn.miniCheckPending = false;
      inn.miniCheckBowlerId = undefined;
      inn.bowlerPromptMode = undefined;
      inn.excludedBowlerIdForPrompt = undefined;
    });
  },

  startSecondInnings: (strikerId, nonStrikerId, bowlerId, wicketkeeperId) => {
    withActive(set, get, (m) => {
      m.currentInningsIndex = 1;
      const inn = m.innings[1];
      inn.currentStrikerId = strikerId;
      inn.currentNonStrikerId = m.rules.nonStriker ? nonStrikerId : undefined;
      inn.currentBowlerId = bowlerId;
      inn.wicketkeeperId = wicketkeeperId;
      ensureBatter(inn, strikerId);
      if (m.rules.nonStriker && nonStrikerId) ensureBatter(inn, nonStrikerId);
      ensureBowler(inn, bowlerId);
    });
  },

  finishMatch: (manOfTheMatchId, manOfTheMatchTeamIndex) => {
    withActive(set, get, (m) => {
      m.status = "completed";
      if (!m.resultText) {
        const r = computeResult(m);
        m.winnerIndex = r.winnerIndex;
        m.resultText = r.text;
      }
      if (manOfTheMatchId) {
        m.manOfTheMatchId = manOfTheMatchId;
        m.manOfTheMatchTeamIndex = manOfTheMatchTeamIndex;
      } else if (!m.manOfTheMatchId) {
        const mom = pickManOfTheMatch(m);
        if (mom) {
          m.manOfTheMatchId = mom.playerId;
          m.manOfTheMatchTeamIndex = mom.teamIndex;
        }
      }
    });
    set({ activeMatchId: null });
    persist(get);
  },

  quitMatch: () => {
    withActive(set, get, (m) => {
      m.status = "quit";
    });
    set({ activeMatchId: null });
    persist(get);
  },

  resumeMatch: (id) => {
    set((s) => {
      const m = s.matches.find((x) => x.id === id);
      if (!m) return s;
      const next = s.matches.map((x) =>
        x.id === id ? { ...x, status: "in_progress" as const } : x,
      );
      return { matches: next, activeMatchId: id };
    });
    persist(get);
  },

  setRelluKattaSide: (battingTeam, bowlingTeam) => {
    withActive(set, get, (m) => {
      m.rk = { currentBattingTeam: battingTeam, currentBowlingTeam: bowlingTeam };
    });
  },
}));

function formatDismissal(m: Match, w: Wicket): string {
  const bowler = nameFor(m, m.innings[m.currentInningsIndex].currentBowlerId);
  const fielder = w.fielderId ? nameFor(m, w.fielderId) : undefined;
  switch (w.type) {
    case "Bowled":
      return `b ${bowler}`;
    case "LBW":
      return `lbw b ${bowler}`;
    case "Caught":
      return `c ${fielder ?? "sub"} b ${bowler}`;
    case "Caught And Bowled":
      return `c & b ${bowler}`;
    case "Stumped":
      return `st ${m.innings[m.currentInningsIndex].wicketkeeperId ? nameFor(m, m.innings[m.currentInningsIndex].wicketkeeperId) : "wk"} b ${bowler}`;
    case "Run Out":
      return `run out${fielder ? ` (${fielder})` : ""}`;
    case "Hit Wicket":
      return `hit wicket b ${bowler}`;
    case "Obstructing the Field":
      return "obstructing the field";
    case "Hit the Ball Twice":
      return "hit the ball twice";
    case "Timed Out":
      return "timed out";
  }
}

function nameFor(m: Match, id?: ID): string {
  if (!id) return "—";
  for (const t of m.teams) {
    const p = t.players.find((x) => x.id === id);
    if (p) return p.name;
  }
  return "—";
}

// Rebuild innings totals from ball list (used after undo / dismiss over)
function rebuildInnings(m: Match, inn: Innings, kept: BallEvent[]) {
  const battingIdx = inn.battingTeamIndex;
  const wk = inn.wicketkeeperId;
  // reset
  inn.balls = [];
  inn.batters = {};
  inn.bowlers = {};
  inn.fielding = {};
  inn.fallOfWickets = [];
  inn.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 };
  inn.battingOrder = [];
  inn.totalRuns = 0;
  inn.totalWickets = 0;
  inn.legalBalls = 0;
  inn.freeHitNext = false;
  inn.oversBowledByBowlerHistory = [];
  inn.bowlerOverCount = {};
  inn.done = false;
  inn.wicketkeeperId = wk;

  // Pick openers from first balls
  if (kept.length > 0) {
    const first = kept[0];
    inn.currentStrikerId = first.batsmanOnStrike;
    inn.currentNonStrikerId = first.nonStriker;
    inn.currentBowlerId = first.bowlerId;
  }

  for (const ball of kept) {
    // Re-apply ball as if recording
    inn.currentStrikerId = ball.batsmanOnStrike;
    inn.currentNonStrikerId = ball.nonStriker;
    inn.currentBowlerId = ball.bowlerId;
    const striker = ball.batsmanOnStrike;
    const bowlerId = ball.bowlerId;
    const batter = ensureBatter(inn, striker);
    const bowler = ensureBowler(inn, bowlerId);
    inn.freeHitNext = ball.isFreeHit;
    if (ball.extraType === "wide") {
      inn.extras.wides += ball.extraRuns;
      bowler.runsConceded += ball.extraRuns;
      bowler.wides += 1;
      inn.totalRuns += ball.extraRuns;
    } else if (ball.extraType === "noball") {
      inn.extras.noBalls += ball.extraRuns;
      bowler.runsConceded += ball.extraRuns + ball.runs;
      bowler.noBalls += 1;
      inn.totalRuns += ball.extraRuns + ball.runs;
      batter.balls += 1;
      batter.runs += ball.runs;
      if (ball.runs === 4) {
        batter.fours += 1;
        bowler.fours += 1;
      }
      if (ball.runs === 6) {
        batter.sixes += 1;
        bowler.sixes += 1;
      }
    } else if (ball.extraType === "bye") {
      inn.extras.byes += ball.extraRuns;
      inn.totalRuns += ball.extraRuns;
      batter.balls += 1;
    } else if (ball.extraType === "legbye") {
      inn.extras.legByes += ball.extraRuns;
      inn.totalRuns += ball.extraRuns;
      batter.balls += 1;
    } else if (ball.extraType === "penalty") {
      inn.extras.penalty += ball.extraRuns;
      inn.totalRuns += ball.extraRuns;
    } else {
      // normal delivery
      batter.balls += 1;
      batter.runs += ball.runs;
      bowler.runsConceded += ball.runs;
      inn.totalRuns += ball.runs;
      if (ball.runs === 4) {
        batter.fours += 1;
        bowler.fours += 1;
      }
      if (ball.runs === 6) {
        batter.sixes += 1;
        bowler.sixes += 1;
      }
      if (ball.runs === 0 && !ball.wicket) bowler.dots += 1;
    }
    if (ball.wicket) {
      inn.totalWickets += 1;
      const o = ensureBatter(inn, ball.wicket.outBatsmanId);
      o.out = true;
      o.dismissal = formatDismissal(m, ball.wicket);
      inn.fallOfWickets.push({
        wicketNumber: inn.totalWickets,
        runs: inn.totalRuns,
        overs: oversString(inn.legalBalls + (ball.isLegal ? 1 : 0)),
        batsmanOutId: ball.wicket.outBatsmanId,
      });
      if (shouldCreditBowlerForWicket(ball.wicket.type)) bowler.wickets += 1;
      if (
        (ball.wicket.type === "Caught" || ball.wicket.type === "Caught And Bowled") &&
        ball.wicket.fielderId
      ) {
        ensureFielder(inn, ball.wicket.fielderId).catches += 1;
      }
      if (ball.wicket.type === "Run Out" && ball.wicket.fielderId)
        ensureFielder(inn, ball.wicket.fielderId).runouts += 1;
      if (ball.wicket.type === "Stumped" && inn.wicketkeeperId)
        ensureFielder(inn, inn.wicketkeeperId).stumpings += 1;
      if (inn.currentStrikerId === ball.wicket.outBatsmanId) inn.currentStrikerId = undefined;
      if (inn.currentNonStrikerId === ball.wicket.outBatsmanId) inn.currentNonStrikerId = undefined;
    }
    if (ball.isLegal) {
      inn.legalBalls += 1;
      bowler.ballsBowled += 1;
      if (ball.isFreeHit) inn.freeHitNext = false;
      const lastSpell = inn.oversBowledByBowlerHistory[inn.oversBowledByBowlerHistory.length - 1];
      if (lastSpell && lastSpell.bowlerId === bowlerId) {
        lastSpell.legalBalls += 1;
      } else {
        inn.oversBowledByBowlerHistory.push({ bowlerId, legalBalls: 1 });
      }
    }
    if (ball.swapEnds && inn.currentStrikerId && inn.currentNonStrikerId) {
      const t = inn.currentStrikerId;
      inn.currentStrikerId = inn.currentNonStrikerId;
      inn.currentNonStrikerId = t;
    }
    if (ball.isLegal && inn.legalBalls > 0 && inn.legalBalls % 6 === 0) {
      if (inn.currentStrikerId && inn.currentNonStrikerId) {
        const t = inn.currentStrikerId;
        inn.currentStrikerId = inn.currentNonStrikerId;
        inn.currentNonStrikerId = t;
      }
      inn.bowlerOverCount[bowlerId] = (inn.bowlerOverCount[bowlerId] ?? 0) + 1;
      inn.previousBowlerId = bowlerId;
      inn.currentBowlerId = undefined;
    }
    if (ball.extraType === "noball" && m.rules.freeHitAfterNoBall) {
      inn.freeHitNext = true;
    }
    if (m.rules.lastBallFreeHit && inn.legalBalls > 0 && inn.legalBalls % 6 === 5) {
      inn.freeHitNext = true;
    }
    inn.balls.push(ball);
  }
}

// Helpers exposed for components
export function makeSavedTeam(name: string, players: Player[]): SavedTeam {
  return {
    id: uuid(),
    name,
    players,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function makePlayer(name: string, photo?: string): Player {
  return { id: uuid(), name, photo };
}

export { ballShortLabel };
