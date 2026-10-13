import type { Metadata } from "next";
import Link from "next/link";
import { STATIC_SITE } from "@/lib/deploy";
import { PageHeader } from "@/components/PageHeader";
import { SOURCES } from "@/content/sources";
import { APP_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "How we verify information" };

export default function AboutPage() {
  return (
    <div className="max-w-3xl space-y-5 text-[15px] leading-relaxed">
      <PageHeader eyebrow="Trust" title={<>How we verify information</>} />
      <p>
        {APP_NAME} is free and independent. We don&apos;t take commissions from universities, consultants or agents. Our only goal is to give Indian students
        correct information in one place.
      </p>

      <section className="card">
        <h2 className="h2">Our rules</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>Only official sources: German law, German government and missions, APS India, DAAD, HRK, universities. Never blogs, consultants or forums.</li>
          <li>Every fact shows its source and the date we last checked it. Facts past their review date are marked &quot;may be outdated&quot;.</li>
          <li>We don&apos;t guess. If a deadline is written as free text with conditions, we show the original wording instead of converting it into a date.</li>
          <li>Automatic checks flag conflicts — for example, a Baden-Württemberg course listed as tuition-free, although the state charges non-EU students.</li>
          <li>
            AI never creates facts or alerts. When an official page changes, Setu publishes the changed lines word for word, with a link to the page, and
            only once the change is still there on the next day&apos;s check. Alerts written by a person are marked as such.
          </li>
          <li>
            Everything updates by itself in the cloud, for everyone using Setu: official sources and facts are re-checked every morning; course data from
            DAAD and the course pages of the universities are re-read every week. If a fact&apos;s official page changes, the fact shows a warning at once.
          </li>
          <li>Anyone can report a mistake. A person checks every report against the official source.</li>
        </ol>
      </section>

      <section className="card">
        <h2 className="h2">Where the course data comes from</h2>
        <p className="mt-2">
          Course details come from the DAAD International Programmes database. We keep only programmes at institutions that the official Hochschulkompass
          register (German Rectors&apos; Conference) lists as public (&quot;öffentlich-rechtlich&quot;). Private and church-run universities are excluded.
        </p>
        <p className="mt-2 text-muted">
          Limitation: the DAAD database lists international programmes. Some German-taught Master&apos;s programmes at public universities are not in it.
        </p>
      </section>

      <section className="card">
        <h2 className="h2">All sources we use</h2>
        <ul className="mt-2 space-y-1">
          {Object.values(SOURCES).map((s) => (
            <li key={s.url + s.name}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="h2">Your privacy</h2>
        <p className="mt-2">
          Your saved courses, checklists, cost plans, practice results and work entries are stored only in your own browser. You can use all of Setu
          without an account, and we don&apos;t collect personal data for any of it.
        </p>
        {!STATIC_SITE && (
        <p className="mt-2">
          The only exception is the optional{" "}
          <Link href="/connect/ask" className="text-accent underline">
            senior Q&amp;A
          </Link>
          . If you sign in there, we store your email address (only to send sign-in links and to check whether it belongs to a German public university —
          it is never shown to anyone), the display name you choose, your posts and a sign-in cookie. Expired sign-in links and sessions are deleted automatically.
          You can delete your account and all your posts yourself at any time on the Q&amp;A page.
        </p>
        )}
        <p className="mt-2">
          Letters you photograph or paste into the letter explainer are read inside your browser and never uploaded. The optional AI explanation, where
          available, sends the text to Setu&apos;s own server only when you press the button, and the text is not stored.
        </p>
        <p className="mt-2">Map and place data: © OpenStreetMap contributors, available under the Open Database License (ODbL).</p>
      </section>

      <p className="text-sm text-muted">
        This is not legal or immigration advice. Always confirm with the official source before you make a decision or pay money.
      </p>
    </div>
  );
}
