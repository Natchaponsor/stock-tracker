"use client";

import { NavBar } from "./NavBar";
import { FixRule } from "./FixRule";
import { Footer } from "./Footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <FixRule />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-10 sm:px-6">{children}</main>
      <Footer />
    </div>
  );
}
