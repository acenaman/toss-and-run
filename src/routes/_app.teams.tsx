import { createFileRoute } from "@tanstack/react-router";
import { TeamsScreen } from "@/components/teams/TeamsScreen";

export const Route = createFileRoute("/_app/teams")({
  component: TeamsScreen,
});
