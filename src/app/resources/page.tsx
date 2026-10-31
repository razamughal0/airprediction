import type { Metadata } from "next";
import Portal from "@/components/portal";

export const metadata: Metadata = { title: "Uplift — Resources" };

export default function ResourcesPage() {
  return <Portal initialView="resources" />;
}
