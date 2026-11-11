"use client";

import { NavyShell } from "@/components/navy/NavyShell";
import { SyncAgent } from "@/components/shell/SyncAgent";
import { SyncDialog } from "@/components/shell/SyncDialog";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavyShell>{children}</NavyShell>
      <SyncAgent />
      <SyncDialog />
    </>
  );
}
