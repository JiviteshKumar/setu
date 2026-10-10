import type { Metadata } from "next";
import { TASKS } from "@/lib/prep/engine";
import { TrainRunner } from "../../components/TrainRunner";

export const metadata: Metadata = { title: `Train: ${TASKS.equations.name}` };

export default function Page() {
  return <TrainRunner type="equations" />;
}
