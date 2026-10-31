import type { Metadata } from "next";
import Portal from "@/components/portal";

export const metadata: Metadata = { title: "Uplift — Records" };

export default function RecordsPage() {
  return <Portal initialView="records" />;
}
