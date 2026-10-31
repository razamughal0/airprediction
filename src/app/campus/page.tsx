import type { Metadata } from "next";
import Portal from "@/components/portal";

export const metadata: Metadata = { title: "AIR — 3D Digital Campus & Classroom Allocation" };

export default function CampusPage() {
  return <Portal initialView="campus" />;
}
