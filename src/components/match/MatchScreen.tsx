import { useApp } from "@/lib/store";
import { SetupScreen } from "./SetupScreen";
import { RulesScreen } from "./RulesScreen";
import { TossScreen } from "./TossScreen";
import { OpenersScreen } from "./OpenersScreen";
import { ScorerScreen } from "./ScorerScreen";
import { SummaryScreen } from "./SummaryScreen";

export function MatchScreen() {
  const activeId = useApp((s) => s.activeMatchId);
  const match = useApp((s) => s.matches.find((m) => m.id === activeId) ?? null);

  if (!match) return <SetupScreen />;

  // Determine phase
  if (match.status === "completed") return <SummaryScreen />;
  if (!match.rules || match.needsRules) return <RulesScreen />;
  if (!match.toss) return <TossScreen />;

  const inn = match.innings[match.currentInningsIndex];
  const needsInitialSetup = inn.balls.length === 0 && (!inn.currentStrikerId || (match.rules.nonStriker && !inn.currentNonStrikerId) || !inn.currentBowlerId);
  if (needsInitialSetup) {
    return <OpenersScreen />;
  }
  return <ScorerScreen />;
}
