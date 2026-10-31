import type { Metadata } from "next";
import Portal from "@/components/portal";

export const metadata: Metadata = { title: "Uplift — Settings" };

export default function SettingsPage() {
  return <Portal initialView="settings" />;
}
