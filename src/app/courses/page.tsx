import type { Metadata } from "next";
import Portal from "@/components/portal";

export const metadata: Metadata = { title: "AIR — Courses, Faculty Workload & CR Management" };

export default function CoursesPage() {
  return <Portal initialView="courses" />;
}
