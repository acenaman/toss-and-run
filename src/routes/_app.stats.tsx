import { createFileRoute } from "@tanstack/react-router";
import { StatsScreen } from "@/components/stats/StatsScreen";

export const Route = createFileRoute("/_app/stats")({
  component: StatsScreen,
});
