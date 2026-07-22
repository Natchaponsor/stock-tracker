"use client";

import { NavBar } from "./NavBar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <TopBar />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
