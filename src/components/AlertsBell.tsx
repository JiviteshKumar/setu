"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useSeenAlerts } from "@/lib/alertsSeen";
import { isNews, usePlanUpdates, useSeenPlanUpdates } from "@/lib/myIntake";

export function AlertsBell({ ids }: { ids: string[] }) {
  const [seen, , loaded] = useSeenAlerts();
  const plan = usePlanUpdates();
  const [seenPlan, , planLoaded] = useSeenPlanUpdates();
  // Official alerts plus news about the student's saved courses for their intake (e.g. "applications open in 5 days").
  const planUnread = plan && planLoaded ? plan.updates.filter((u) => isNews(u) && !seenPlan.includes(u.key)).length : 0;
  const unread = (loaded ? ids.filter((id) => !seen.includes(id)).length : 0) + planUnread;
  return (
    <Link href="/alerts" aria-label={unread ? `${unread} new alert${unread === 1 ? "" : "s"}` : "Alerts"} className="relative grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text">
      <motion.svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="currentColor"
        aria-hidden
        animate={unread ? { rotate: [0, -16, 13, -9, 6, 0] } : { rotate: 0 }}
        transition={{ duration: 0.9, delay: 0.6 }}
        style={{ transformOrigin: "50% 10%" }}
      >
        <path d="M12 2a6 6 0 0 0-6 6v3.6L4.3 15A1 1 0 0 0 5.2 16.5h13.6a1 1 0 0 0 .9-1.5L18 11.6V8a6 6 0 0 0-6-6zm0 20a3 3 0 0 0 2.8-2H9.2A3 3 0 0 0 12 22z" />
      </motion.svg>
      <AnimatePresence>
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 18 }}
            className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
          >
            {unread}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
