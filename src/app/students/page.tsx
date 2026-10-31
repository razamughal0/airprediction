import type { Metadata } from "next";
import Portal from "@/components/portal";

export const metadata: Metadata = { title: "Uplift — Students" };

export default function StudentsPage() {
  return <Portal initialView="students" />;
}
