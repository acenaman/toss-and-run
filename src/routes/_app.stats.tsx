import { createFileRoute } from "@tanstack/react-router";
import { StatsScreen } from "@/components/stats/StatsScreen";

const DESCRIPTION = "View batting averages, strike rates, bowling figures, Orange Cap, Purple Cap, and team standings across all matches.";

export const Route = createFileRoute("/_app/stats")({
  head: () => ({
    meta: [
      { title: "Player Stats & Leaderboards — Gully Cricket" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Player Stats & Leaderboards — Gully Cricket" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://gully-cricet-scorer.lovable.app/stats" },
    ],
    links: [
      { rel: "canonical", href: "https://gully-cricet-scorer.lovable.app/stats" },
    ],
  }),
  component: StatsScreen,
});
