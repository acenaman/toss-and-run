import { createFileRoute } from "@tanstack/react-router";
import { MatchScreen } from "@/components/match/MatchScreen";

export const Route = createFileRoute("/_app/match")({
  component: MatchScreen,
});
