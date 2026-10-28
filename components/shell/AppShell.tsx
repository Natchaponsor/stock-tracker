"use client";

import { NavyShell } from "@/components/navy/NavyShell";

export function AppShell({ children }: { children: React.ReactNode }) {
  return <NavyShell>{children}</NavyShell>;
}
