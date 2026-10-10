// Explicit prop types (not PageProps<…>): this route is left out of the static build, where its route type doesn't exist.
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { completeSignIn } from "./actions";

export const metadata: Metadata = { title: "Sign in", robots: { index: false }, referrer: "no-referrer" };

// Opening the emailed link only shows this page; the token is spent when the button is pressed. University mail
// systems often open links automatically to scan them, which would otherwise use up the single-use link.
export default function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageHeader eyebrow="Community" title={<>Finish signing in</>} />
      <Suspense fallback={<div className="card h-24 animate-pulse" />}>
        <Confirm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Confirm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token) return <p className="card text-sm text-muted">This sign-in link is incomplete. Please request a new one.</p>;
  return (
    <form action={completeSignIn} className="card space-y-3">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-muted">Press the button to sign in on this device. The link works once and expires 30 minutes after you requested it.</p>
      <button className="btn-primary w-full">Sign in to the Q&amp;A</button>
    </form>
  );
}
