import type { Metadata } from "next";
import Portal from "@/components/portal";

export const metadata: Metadata = { title: "AIR — Air University Portal Login" };

export default function LoginPage() {
  return <Portal initialView="overview" openLoginOnMount />;
}
