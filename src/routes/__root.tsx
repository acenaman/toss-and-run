import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {

  Outlet,

  Link,

  createRootRouteWithContext,

  useRouter,

  HeadContent,

  Scripts,

} from "@tanstack/react-router";

import { useEffect, type ReactNode } from "react";



import appCss from "../styles.css?url";

import { reportLovableError } from "../lib/lovable-error-reporting";

import { Toaster } from "@/components/ui/sonner";

import { useApp } from "@/lib/store";

import { setupPwa } from "@/lib/pwa";



function NotFoundComponent() {

  return (

    <div className="flex min-h-screen items-center justify-center bg-background px-4">

      <div className="max-w-md text-center">

        <h1 className="text-7xl font-bold text-foreground">404</h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>

        <p className="mt-2 text-sm text-muted-foreground">

          The page you're looking for doesn't exist.

        </p>

        <div className="mt-6">

          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">

            Go home

          </Link>

        </div>

      </div>

    </div>

  );

}



function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {

  console.error(error);

  const router = useRouter();

  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root" }); }, [error]);

  return (

    <div className="flex min-h-screen items-center justify-center bg-background px-4">

      <div className="max-w-md text-center">

        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>

        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">

          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Try again</button>

          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium">Go home</a>

        </div>

      </div>

    </div>

  );

}



export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({

  head: () => ({

    meta: [

      { charSet: "utf-8" },

      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" },

      { name: "theme-color", content: "#ff7a1a" },

      { title: "Gully Cricket Scorer — Street Cricket Scorecard & Stats" },

      { name: "description", content: "Free mobile cricket scorer for local matches. Track overs, runs, wickets, player stats, and share scorecards — offline or synced." },

      { name: "google-site-verification", content: "-3WeXfExG_fWA2-4FzGRqPToHBmwbmFYNwM073uNrc0" },

      { name: "apple-mobile-web-app-capable", content: "yes" },

      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },

      { name: "apple-mobile-web-app-title", content: "GullyScore" },

      { property: "og:title", content: "Gully Cricket Scorer — Street Cricket Scorecard & Stats" },

      { property: "og:description", content: "Free mobile cricket scorer for local matches. Track overs, runs, wickets, player stats, and share scorecards — offline or synced." },

      { property: "og:type", content: "website" },

      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/J7rdvapZPNQaTccZUs6GWZKRl3C2/social-images/social-1782029055515-logo-transparent.webp" },

      { name: "twitter:card", content: "summary_large_image" },

      { name: "twitter:title", content: "Gully Cricket Scorer — Street Cricket Scorecard & Stats" },
      { name: "twitter:description", content: "Free mobile cricket scorer for local matches. Track overs, runs, wickets, player stats, and share scorecards — offline or synced." },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/J7rdvapZPNQaTccZUs6GWZKRl3C2/social-images/social-1782029055515-logo-transparent.webp" },
    ],

    links: [

      { rel: "stylesheet", href: appCss },

      { rel: "manifest", href: "/manifest.webmanifest" },

      { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon' },

      { rel: "apple-touch-icon", href: '/favicon.ico' },

    ],

  }),

  shellComponent: RootShell,

  component: RootComponent,

  notFoundComponent: NotFoundComponent,

  errorComponent: ErrorComponent,

});



function RootShell({ children }: { children: ReactNode }) {

  return (

    <html lang="en" className="dark">

      <head>

        <HeadContent />

      </head>

      <body>

        {children}

        <Scripts />

      </body>

    </html>

  );

}



function RootComponent() {

  const { queryClient } = Route.useRouteContext();

  const hydrate = useApp((s) => s.hydrate);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => { void setupPwa(); }, []);

  return (

    <QueryClientProvider client={queryClient}>

      <Outlet />

      <Toaster position="top-center" theme="dark" />

    </QueryClientProvider>

  );

}
