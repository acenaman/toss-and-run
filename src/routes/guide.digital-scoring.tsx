import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calculator, History, Share2, WifiOff, Smartphone, Trophy } from "lucide-react";

const DOMAIN = "https://gully-cricet-scorer.lovable.app";

export const Route = createFileRoute("/guide/digital-scoring")({
  component: DigitalScoringGuide,
  head: () => ({
    meta: [
      { title: "Cricket Scoring App: Go Digital for Your Next Local Match" },
      { name: "description", content: "Tired of paper scorecards? Discover why a digital cricket scoring app like Gully Cricket Scorer beats pen and paper with automatic stats, match history, offline mode, and instant sharing." },
      { property: "og:title", content: "Cricket Scoring App: Go Digital for Your Next Local Match" },
      { property: "og:description", content: "Swap paper scorecards for a digital cricket scorer. Automated stats, full match history, offline support, and shareable scorecards." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `${DOMAIN}/guide/digital-scoring` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Cricket Scoring App: Go Digital for Your Next Local Match" },
      { name: "twitter:description", content: "Swap paper scorecards for a digital cricket scorer. Automated stats, full match history, offline support, and shareable scorecards." },
    ],
    links: [
      { rel: "canonical", href: `${DOMAIN}/guide/digital-scoring` },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Gully Cricket Scorer vs Paper: Why Go Digital for Your Next Match?",
          description: "A guide to choosing a digital cricket scoring app over paper scorecards for local gully and friendly matches.",
          author: {
            "@type": "Organization",
            name: "Gully Cricket Scorer",
          },
          publisher: {
            "@type": "Organization",
            name: "Gully Cricket Scorer",
            logo: {
              "@type": "ImageObject",
              url: `${DOMAIN}/logo-transparent.png`,
            },
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `${DOMAIN}/guide/digital-scoring`,
          },
        }),
      },
    ],
  }),
});

function DigitalScoringGuide() {
  return (
    <div className="space-y-6 pb-24">
      <section className="text-center space-y-3 py-6">
        <h1 className="text-3xl font-display tracking-wide text-foreground">
          Gully Cricket Scorer vs Paper
        </h1>
        <p className="text-lg text-muted-foreground">
          Why go digital for your next local match?
        </p>
        <Button asChild className="mt-4">
          <Link to="/match">Start scoring your first match</Link>
        </Button>
      </section>

      <Card className="p-5 space-y-3">
        <h2 className="text-xl font-semibold">The paper scorecard problem</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          If you have ever scored a gully or friendly cricket match with a notebook, you know the drill: crossed-out runs, debates over who faced how many balls, and a scorecard that is unreadable by the 10th over. Paper works in the moment, but it falls apart when you want to track player stats, settle a dispute, or look back at last month’s tournament.
        </p>
      </Card>

      <section>
        <h2 className="text-xl font-semibold mb-3">Why a cricket scoring app wins</h2>
        <div className="grid gap-3">
          <Benefit
            icon={<Calculator className="w-5 h-5 text-primary" />}
            title="Automated stats in real time"
            description="Runs, strike rate, economy, wickets, and fours/sixes update ball by ball. No mental math, no tally marks."
          />
          <Benefit
            icon={<History className="w-5 h-5 text-primary" />}
            title="Match history that lasts forever"
            description="Every completed, quit, and resumed match is saved automatically. Look back at team records, player growth, and season totals anytime."
          />
          <Benefit
            icon={<WifiOff className="w-5 h-5 text-primary" />}
            title="Works offline"
            description="No internet at the ground? No problem. Score the full match offline; cloud sync only kicks in when you are back online."
          />
          <Benefit
            icon={<Share2 className="w-5 h-5 text-primary" />}
            title="Share the scorecard instantly"
            description="Export the full scorecard as a PNG or PDF, or share it directly to WhatsApp, Telegram, and Instagram."
          />
          <Benefit
            icon={<Smartphone className="w-5 h-5 text-primary" />}
            title="Built for mobile"
            description="Large scoring buttons, one-tap extras, voice scoring, and a layout designed for phones in bright sunlight."
          />
          <Benefit
            icon={<Trophy className="w-5 h-5 text-primary" />}
            title="Leaderboards and rivalries"
            description="Automatic Orange Cap, Purple Cap, and team standings turn every match into a mini tournament."
          />
        </div>
      </section>

      <Card className="p-5 space-y-4">
        <h2 className="text-xl font-semibold">Who is this for?</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <ListItem>Local gully cricket groups and colony tournaments</ListItem>
          <ListItem>School, college, and corporate friendly matches</ListItem>
          <ListItem>Coaches who want player stats after every net game</ListItem>
          <ListItem>Anyone tired of losing paper scorecards</ListItem>
        </ul>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-xl font-semibold">What Reddit users ask about scoring apps</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">“What is the best app for scoring my own matches?”</strong>
            <br />
            Look for an app that is offline-first, has one-tap scoring, and saves full history. Gully Cricket Scorer is built exactly for that.
          </p>
          <p>
            <strong className="text-foreground">“Can I track stats without paying?”</strong>
            <br />
            Yes. The app stores everything locally on your device for free, with optional Google cloud sync across devices.
          </p>
          <p>
            <strong className="text-foreground">“Can I share the scorecard on WhatsApp?”</strong>
            <br />
            Yes. Export as PNG or PDF and share directly, or copy the scorecard summary to any chat.
          </p>
        </div>
      </Card>

      <Card className="p-5 text-center space-y-3">
        <h2 className="text-xl font-semibold">Ready to ditch the notebook?</h2>
        <p className="text-sm text-muted-foreground">
          Open the app, set your teams and overs, and start scoring in under a minute. No signup required to use offline.
        </p>
        <Button asChild className="w-full h-12 text-base">
          <Link to="/match">Open the scorer</Link>
        </Button>
      </Card>
    </div>
  );
}

function Benefit({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 bg-card rounded-lg p-4 border border-border/50">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="space-y-1">
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}
