import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

// Shown by the service worker (public/sw.js) when the app is opened without a connection and the page wasn't saved.
export default function OfflinePage() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="No connection" title={<>You&apos;re offline</>}>
        This page hasn&apos;t been saved on your phone yet. Pages you opened before still work, and so does everything stored on your device — your
        saved courses, plan, checklists and practice results.
      </PageHeader>
      <p className="card text-sm">
        Offline you see each page as it was when you last opened it. Deadlines and rules can change, so check again when you&apos;re back online before
        you act on anything.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/tracker" className="btn-primary">
          Open my plan
        </Link>
        <Link href="/" className="btn-ghost">
          Home
        </Link>
      </div>
    </div>
  );
}
