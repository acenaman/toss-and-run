import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { Trophy, History, Users, ClipboardList } from "lucide-react";
import logoAsset from "@/assets/logo.png.asset.json";
import { cn } from "@/lib/utils";
import { CloudSyncStatus } from "@/components/CloudSyncStatus";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-30 gully-gradient stadium-grain border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src='/logo-transparent.png' alt="" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-lg leading-none tracking-wide">GULLY CRICKET SCORER</h1>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Score · Stats · Share</p>
          </div>
          <div className="ml-auto"><CloudSyncStatus /></div>
        </div>
      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto px-3 pt-3 safe-bottom">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  const items = [
    { to: "/match", label: "Match", Icon: ClipboardList },
    { to: "/stats", label: "Stats", Icon: Trophy },
    { to: "/history", label: "History", Icon: History },
    { to: "/teams", label: "Teams", Icon: Users },
  ] as const;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur">
      <div className="max-w-2xl mx-auto grid grid-cols-4">
        {items.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center justify-center py-2 text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            {({ isActive }) => (
              <>
                <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                <span className={cn("text-[11px] mt-0.5", isActive && "text-primary font-semibold")}>{label}</span>
              </>
            )}
          </Link>
        ))}
      </div>
      <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
    </nav>
  );
}
