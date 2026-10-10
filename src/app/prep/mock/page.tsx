import type { Metadata } from "next";
import { SessionRunner } from "../components/SessionRunner";

export const metadata: Metadata = { title: "dMAT mock exam" };

export default function MockPage() {
  return (
    <SessionRunner
      mode="mock"
      title="Full dMAT mock exam"
      breakMinutes={30}
      sections={[
        { type: "figures", count: 20, minutes: 25 },
        { type: "equations", count: 20, minutes: 25 },
        { type: "latin", count: 20, minutes: 25 },
        { type: "subject", count: 6, minutes: 90 },
      ]}
      intro={
        <>
          <p>
            The Core Module (three timed parts, 20 tasks each in 25 minutes), a break, then the Subject Module (90 minutes). Plan about 3 hours and a quiet
            place, like on exam day.
          </p>
          <p className="mt-2">
            g.a.s.t. does not publish how many texts the Subject Module contains; this mock uses 6 original texts with 6 questions each. Your result is a practice
            score, not an official dMAT score.
          </p>
        </>
      }
    />
  );
}
