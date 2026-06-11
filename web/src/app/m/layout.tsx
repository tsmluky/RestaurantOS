import type { Metadata, Viewport } from "next";

import { MobileShell } from "@/components/mobile/mobile-shell";

import "./mobile.css";

export const metadata: Metadata = {
  title: "RestaurantOS",
  description: "Fichaje y gestión de equipo",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RestaurantOS"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0F172A"
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell>{children}</MobileShell>;
}
