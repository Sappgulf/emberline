import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Emberline";

function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ink px-6 py-16 text-center">
      <img src="/ui/emberline-crest-v1.png" alt="" className="h-20 w-auto" />
      <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.28em] text-ember">Off the road</p>
      <h1 className="font-display text-4xl text-parchment sm:text-5xl">Nothing stands here</h1>
      <p className="max-w-sm font-sans text-sm leading-6 text-dust">
        This path leads into the woods. Return to the watch post and hold the ember line.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-md border border-copper/60 bg-bark px-5 py-2.5 font-sans text-sm font-semibold text-parchment transition-colors hover:bg-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
      >
        Back to the watch
      </Link>
    </main>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "description", content: "Hold the ember line. Place towers, spend gold, and stop the creeps." },
      { name: "theme-color", content: "#12160f" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,700&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-ink text-parchment antialiased">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
  notFoundComponent: NotFoundPage,
});
