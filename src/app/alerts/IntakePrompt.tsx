"use client";

import { IntakePicker } from "@/components/IntakePicker";
import { useMyIntake } from "@/lib/myIntake";

/** Asks for the target intake only while none is chosen (once chosen, it can be changed in My plan). */
export function IntakePrompt() {
  const [intake, , loaded] = useMyIntake();
  if (!loaded || intake) return null;
  return <IntakePicker title="Get updates for your intake" hint="Choose when you want to start, and save courses — the bell then tells you when their applications open and close." />;
}
