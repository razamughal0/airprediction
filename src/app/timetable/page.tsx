import type { Metadata } from "next";
import Portal from "@/components/portal";

export const metadata: Metadata = { title: "AIR — Weekly Faculty Schedule & Timetable" };

export default function TimetablePage() {
  return <Portal initialView="timetable" />;
}
