import { createFileRoute } from "@tanstack/react-router";
import { MatchScreen } from "@/components/match/MatchScreen";

const DESCRIPTION = "Score your cricket match ball-by-ball. Track runs, wickets, extras, and strike rotation with the free Gully Cricket Scorer app.";

export const Route = createFileRoute("/_app/match")({
  head: () => ({
    meta: [
      { title: "Live Cricket Scorecard — Gully Cricket Scorer" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Live Cricket Scorecard — Gully Cricket Scorer" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://gully-cricet-scorer.lovable.app/match" },
    ],
    links: [
      { rel: "canonical", href: "https://gully-cricet-scorer.lovable.app/match" },
    ],
  }),
  component: MatchScreen,
});
