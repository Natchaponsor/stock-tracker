import { appIcon } from "@/lib/server/appIcon";

/** The iPhone home-screen icon. iOS rounds the corners itself, so it is drawn full-bleed. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return appIcon(180, "full");
}
