import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { CostPlanner } from "./CostPlanner";
import { FactCard } from "@/components/FactCard";
import { FACTS } from "@/content/facts";

export const metadata: Metadata = { title: "Cost planner in rupees" };

export default function CostsPage() {
  const facts = FACTS.filter((f) => f.topic === "money" || f.topic === "fees" || f.id === "student-insurance-30");
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Money" title={<>What will it cost? (in ₹)</>}>
        Enter your own numbers — we don&apos;t make up averages. Course pages show each university&apos;s own estimate for rent and living costs. Your data
        stays on your phone.
      </PageHeader>
      <CostPlanner />
      <h2 className="h2 pt-2">Verified money facts</h2>
      {facts.map((f) => (
        <FactCard key={f.id} fact={f} />
      ))}
    </div>
  );
}
