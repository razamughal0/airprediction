import type { Metadata } from "next";
import Portal from "@/components/portal";

export const metadata: Metadata = { title: "Uplift — Interventions" };

export default function InterventionsPage() {
  return <Portal initialView="interventions" />;
}
