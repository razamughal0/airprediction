import type { Metadata } from "next";
import Portal from "@/components/portal";

export const metadata: Metadata = { title: "AIR — GPA Engine, Backlogs & Dropped Courses" };

export default function AcademicsPage() {
  return <Portal initialView="academics" />;
}
