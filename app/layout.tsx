import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
/* Navy Stream: tokens first, then the component classes that read them. */
import "@/styles/navy-stream/tokens.css";
import "@/styles/navy-stream/bundle.css";
import { AppShell } from "@/components/shell/AppShell";
import { ServiceWorker } from "@/components/shell/ServiceWorker";
import { token } from "@/lib/server/tokens";

/* Navy Stream's one family. tokens.css reads --font-inter into --font-sans. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Stock Tracker",
  description:
    "A swing-trading journal with live P&L, FIFO buy/sell and a position journal. Your data stays on your device; pair as many devices as you like with encrypted sync.",
  // Opened from the iPhone home screen: full-screen, named "Stocks" under the icon.
  appleWebApp: { capable: true, title: "Stocks", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // Edge to edge, so the phone tab bar can sit above the home indicator (env(safe-area-inset-*)).
  viewportFit: "cover",
  // Matches the white app header. ThemeToggle updates it when the theme changes.
  themeColor: token("surface-card"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=t==='dark'?'dark':'light';}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
        <ServiceWorker />
      </body>
    </html>
  );
}
