import { notFound } from "next/navigation";
import { appIcon } from "@/lib/server/appIcon";

/** The PNGs the web app manifest lists. Built once per deploy. */
const ICONS = {
  "icon-192.png": { size: 192, shape: "rounded" },
  "icon-512.png": { size: 512, shape: "rounded" },
  "maskable-512.png": { size: 512, shape: "full" },
} as const;

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONS).map((file) => ({ file }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const icon = ICONS[file as keyof typeof ICONS];
  if (!icon) notFound();
  return appIcon(icon.size, icon.shape);
}
