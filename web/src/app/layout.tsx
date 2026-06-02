import type { Metadata } from "next";

import { AuthGate } from "@/components/auth/auth-gate";

import "./globals.css";

export const metadata: Metadata = {
  title: "RestaurantOS Manager",
  description: "Panel operativo para restaurantes locales por Studio32"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
