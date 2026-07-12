import { createFileRoute } from "@tanstack/react-router";
import { TeamsScreen } from "@/components/teams/TeamsScreen";

const DESCRIPTION = "Create and manage cricket teams, players, and squads for quick match setup in Gully Cricket Scorer.";

export const Route = createFileRoute("/_app/teams")({
  head: () => ({
    meta: [
      { title: "Manage Teams & Players — Gully Cricket" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Manage Teams & Players — Gully Cricket" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://gully-cricet-scorer.lovable.app/teams" },
    ],
    links: [
      { rel: "canonical", href: "https://gully-cricet-scorer.lovable.app/teams" },
    ],
  }),
  component: TeamsScreen,
});
