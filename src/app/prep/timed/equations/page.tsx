import type { Metadata } from "next";
import { TASKS } from "@/lib/prep/engine";
import { TimedSet } from "../TimedSet";

export const metadata: Metadata = { title: `Timed: ${TASKS.equations.name}` };

export default function Page() {
  return <TimedSet type="equations" />;
}
