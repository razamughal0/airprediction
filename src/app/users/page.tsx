import type { Metadata } from "next";
import Portal from "@/components/portal";

export const metadata: Metadata = { title: "Uplift — Users" };

export default function UsersPage() {
  return <Portal initialView="users" />;
}
