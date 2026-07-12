import { createFileRoute } from "@tanstack/react-router";
import { HistoryScreen } from "@/components/history/HistoryScreen";

const DESCRIPTION = "Browse past cricket matches, full scorecards, results, and player performances from every saved game.";

export const Route = createFileRoute("/_app/history")({
  head: () => ({
    meta: [
      { title: "Match History & Scorecards — Gully Cricket" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Match History & Scorecards — Gully Cricket" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://gully-cricet-scorer.lovable.app/history" },
    ],
    links: [
      { rel: "canonical", href: "https://gully-cricet-scorer.lovable.app/history" },
    ],
  }),
  component: HistoryScreen,
});
