"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Suspense } from "react";
import { NAV } from "@/lib/site";
import { useSaved } from "@/lib/saved";
import { Icon } from "./Icon";

function isActive(pathname: string | null, href: string) {
  if (pathname === null) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function SavedBadge() {
  const [saved, , loaded] = useSaved();
  if (!loaded || saved.length === 0) return null;
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={saved.length}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.3, opacity: 0 }}
        transition={{ type: "spring", stiffness: 600, damping: 18 }}
        className="absolute -top-1 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent-bright px-1 text-[10px] font-bold text-white"
      >
        {saved.length}
      </motion.span>
    </AnimatePresence>
  );
}

// usePathname() reads the URL, which is not known while a route with dynamic params is prerendered. The Suspense
// fallback is the same nav without the active highlight, so every page keeps a static shell.
export function TopNav() {
  return (
    <Suspense fallback={<TopNavLinks pathname={null} />}>
      <TopNavCurrent />
    </Suspense>
  );
}

function TopNavCurrent() {
  return <TopNavLinks pathname={usePathname()} />;
}

function TopNavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="hidden gap-1 md:flex" aria-label="Main">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} className={`relative rounded-lg px-3 py-2 text-sm ${active ? "font-medium text-accent" : "text-muted hover:text-text"}`}>
            {active && <motion.span layoutId="top-nav-pill" className="absolute inset-0 rounded-lg bg-accent-soft" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span className="relative">
              {item.label}
              {item.href === "/tracker" && <SavedBadge />}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  return (
    <Suspense fallback={<BottomNavLinks pathname={null} />}>
      <BottomNavCurrent />
    </Suspense>
  );
}

function BottomNavCurrent() {
  return <BottomNavLinks pathname={usePathname()} />;
}

function BottomNavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="grid grid-cols-5 pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${active ? "text-accent" : "text-muted"}`}>
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute top-1 h-8 w-14 rounded-full bg-accent-soft"
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  />
                )}
                <motion.span className="relative" animate={{ y: active ? -1 : 0, scale: active ? 1.08 : 1 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
                  <Icon name={item.icon} className="h-5 w-5" />
                  {item.href === "/tracker" && <SavedBadge />}
                </motion.span>
                <span className="relative">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
