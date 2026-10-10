import { TASKS, type TaskType } from "@/lib/prep/engine";
import { SessionRunner } from "../components/SessionRunner";

/** One timed section. Core: the official 20 tasks in 25 minutes. Subject: g.a.s.t. doesn't publish the number of texts, so this is a shorter practice set. */
export function TimedSet({ type }: { type: TaskType }) {
  const t = TASKS[type];
  const spec = t.examCount ? { type, count: t.examCount, minutes: t.examMinutes } : { type, count: 3, minutes: 45 };
  return (
    <SessionRunner
      mode="timed"
      title={`Timed set: ${t.name}`}
      sections={[spec]}
      intro={
        t.examCount ? (
          <p>Exactly like the exam: {t.examCount} tasks in {t.examMinutes} minutes, no feedback until the end. If you don&apos;t know an answer, guess — then move on.</p>
        ) : (
          <p>3 texts with 6 questions each in 45 minutes. The real module lasts 90 minutes; g.a.s.t. does not publish how many texts it contains, so treat this as a shorter practice set.</p>
        )
      }
    />
  );
}
