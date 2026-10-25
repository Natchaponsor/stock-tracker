import type { Metadata } from "next";
import { Archivo, Archivo_Narrow, Azeret_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";

/* The log's three voices: a squarish grotesk for the sheet, a condensed cut
   for stamped band headings, and a mono reserved for fix stamps and times. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const archivoNarrow = Archivo_Narrow({
  variable: "--font-archivo-narrow",
  subsets: ["latin"],
  display: "swap",
});

const azeretMono = Azeret_Mono({
  variable: "--font-azeret",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
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
      className={`${archivo.variable} ${archivoNarrow.variable} ${azeretMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=t==='light'?'light':'dark';}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-fg font-sans" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
