"use client";

import Link from "next/link";

// Shown instead of a blank page if something on a page fails unexpectedly. Data on the device is left untouched.
export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md space-y-4 py-10 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="h1">This page didn&apos;t load properly</h1>
      <p className="text-muted">
        Please try again. If it keeps happening, tell us with the report button on any page — your saved courses and plan are still on this device.
      </p>
      <div className="flex justify-center gap-2">
        <button type="button" className="btn-primary" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          Home
        </Link>
      </div>
    </div>
  );
}
