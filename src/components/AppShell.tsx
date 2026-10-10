"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { NAV } from "@/lib/site";
import { useStoredState } from "@/lib/useStoredState";
import { withBase } from "@/lib/deploy";

// Pieces that make Setu behave like an app when it is installed on a phone's home screen.

const STANDALONE = "(display-mode: standalone)";
function subscribeStandalone(cb: () => void) {
  const mq = window.matchMedia(STANDALONE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
/** True when running as an installed app (Android/desktop: display-mode; iOS: navigator.standalone). */
export function useStandalone(): boolean {
  return useSyncExternalStore(
    subscribeStandalone,
    () => window.matchMedia(STANDALONE).matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => false,
  );
}

/** An installed app has no browser back button, so show one on pages below the main tabs. */
export function AppBackButton() {
  return (
    <Suspense fallback={null}>
      <BackButton />
    </Suspense>
  );
}

function BackButton() {
  const standalone = useStandalone();
  const pathname = usePathname();
  const router = useRouter();
  const top = pathname === "/" || NAV.some((n) => n.href === pathname);
  return (
    <AnimatePresence>
      {standalone && !top && (
        <motion.button
          type="button"
          aria-label="Back"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -6 }}
          onClick={() => (window.history.length > 1 ? router.back() : router.push(pathname.split("/").slice(0, -1).join("/") || "/"))}
          className="-ml-2 grid h-9 w-9 place-items-center rounded-full text-text hover:bg-surface-2"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/**
 * Registers the service worker (public/sw.js) so the installed app opens offline with the pages read before.
 * Production only: in development it would cache pages while you edit them.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(withBase("/sw.js"), { scope: withBase("/") }).catch(() => {});
  }, []);
  return null;
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/**
 * "Install Setu" card for phones that are not running the installed app yet. Android/Chrome: one tap opens the
 * browser's install dialog. iPhone/iPad (Safari has no install API): short instructions. Can be dismissed for good.
 */
export function InstallApp() {
  const standalone = useStandalone();
  const [dismissed, setDismissed, loaded] = useStoredState<boolean>("install-dismissed", false);
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const ios = useSyncExternalStore(
    () => () => {},
    () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    () => false,
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep the browser's mini-bar away; we show our own button
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const show = loaded && !dismissed && !standalone && (event || ios);
  return (
    <AnimatePresence>
      {show && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          className="card flex items-center gap-4 overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
          <img src={withBase("/icons/icon-192.png")} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Install Setu on your phone</p>
            {event ? (
              <p className="text-sm text-muted">Opens full screen from your home screen, works offline for pages you have read.</p>
            ) : (
              <p className="text-sm text-muted">
                In Safari, tap <ShareIcon /> <strong className="text-text">Share</strong>, then <strong className="text-text">Add to Home Screen</strong>.
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {event && (
              <button
                type="button"
                className="btn-primary py-1.5"
                onClick={async () => {
                  await event.prompt();
                  const choice = await event.userChoice;
                  if (choice.outcome === "accepted") setEvent(null);
                }}
              >
                Install
              </button>
            )}
            <button type="button" className="text-xs text-muted underline" onClick={() => setDismissed(true)}>
              Not now
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="inline h-4 w-4 align-[-3px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Share icon">
      <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
