import type { Metadata } from "next";
import Portal from "@/components/portal";

export const metadata: Metadata = { title: "Uplift — Insights" };

export default function InsightsPage() {
  return <Portal initialView="insights" />;
}
