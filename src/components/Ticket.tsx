import type { ReactNode } from "react";

/** Boarding-pass card: a main section, a perforated tear line with punched notches, and a stub. */
export function Ticket({ children, stub, className = "" }: { children: ReactNode; stub?: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-border bg-surface shadow-card ${className}`}>
      <div className="p-5">{children}</div>
      {stub && (
        <>
          <div className="relative h-4">
            <span className="absolute top-1/2 -left-2.5 h-5 w-5 -translate-y-1/2 rounded-full border border-border bg-bg" />
            <span className="absolute top-1/2 -right-2.5 h-5 w-5 -translate-y-1/2 rounded-full border border-border bg-bg" />
            <div className="perforation absolute inset-x-4 top-1/2 h-1 -translate-y-1/2" />
          </div>
          <div className="px-5 pt-1 pb-5">{stub}</div>
        </>
      )}
    </div>
  );
}

export function TicketField({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">{label}</p>
      <p className={`truncate text-[15px] font-semibold ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}
