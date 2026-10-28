import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
/* Navy Stream: tokens first, then the component classes that read them. */
import "@/styles/navy-stream/tokens.css";
import "@/styles/navy-stream/bundle.css";
import { AppShell } from "@/components/shell/AppShell";

/* Navy Stream's one family. tokens.css reads --font-inter into --font-sans. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Stock Tracker",
  description: "A client-side swing-trading journal: outstanding shares with live P&L, FIFO buy/sell, and a position journal — all stored locally in your browser.",
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
      </body>
    </html>
  );
}
