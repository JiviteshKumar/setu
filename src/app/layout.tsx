import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { APP_NAME, APP_TAGLINE } from "@/lib/site";
import { BottomNav, TopNav } from "@/components/Nav";
import { Logo } from "@/components/Logo";
import { AlertsBell } from "@/components/AlertsBell";
import { getAlerts } from "@/lib/alerts";
import { MotionProvider, MotionToggle } from "@/components/motion";
import { Splash, SPLASH_SCRIPT } from "@/components/Splash";
import { getProgrammes } from "@/lib/programmes";
import { AppBackButton, ServiceWorker } from "@/components/AppShell";
import { withBase } from "@/lib/deploy";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Instrument_Serif({ variable: "--font-display", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: `${APP_NAME} – ${APP_TAGLINE}`, template: `%s · ${APP_NAME}` },
  description:
    "Free, source-checked information for Indian students planning a Master's at a public university in Germany: courses, deadlines, APS, dMAT, visa, costs, jobs and life in Germany.",
  applicationName: APP_NAME,
  manifest: withBase("/manifest.webmanifest"), // written by scripts/build-public.ts before each build
  icons: { icon: [{ url: withBase("/icon.svg"), type: "image/svg+xml" }, { url: withBase("/icons/icon-192.png"), sizes: "192x192" }], apple: withBase("/icons/apple-touch-icon.png") },
  // Installed on an iPhone home screen: full-screen app with a transparent status bar over the page.
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  // iOS would otherwise turn numbers such as "1,612" or reference numbers into phone links.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // draw under the notch / home bar; the layout pads with env(safe-area-inset-*)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1016" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const programmes = getProgrammes();
  return (
    // suppressHydrationWarning: the splash script sets data-splash / data-motion on <html> before React loads.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SPLASH_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Splash courses={programmes.length} universities={new Set(programmes.map((p) => p.universityId)).size} />
        <MotionProvider>
          <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
            <div className="safe-x mx-auto flex max-w-5xl items-center justify-between gap-4 py-2.5">
              <span className="flex items-center gap-1">
                <AppBackButton />
                <Link href="/" aria-label={`${APP_NAME} home`}>
                  <Logo />
                </Link>
              </span>
              <div className="flex items-center gap-1">
                <TopNav />
                <AlertsBell ids={getAlerts().map((a) => a.id)} />
              </div>
            </div>
          </header>
          <main className="safe-x mx-auto w-full max-w-5xl flex-1 pt-5 pb-8 md:pb-12">{children}</main>
          <footer className="safe-x mx-auto w-full max-w-5xl pb-28 text-xs text-muted md:pb-8">
            <MotionToggle className="mb-3" />
            <p className="hidden md:block">
              {APP_NAME} is free and independent. Information comes from official sources (DAAD, HRK, APS India, German missions, German law) and is shown
              with its source and check date. It is not legal or immigration advice — always confirm with the official source before you act.{" "}
              <Link href="/about" className="underline">
                How we verify
              </Link>
            </p>
          </footer>
          <BottomNav />
          <ServiceWorker />
        </MotionProvider>
      </body>
    </html>
  );
}
