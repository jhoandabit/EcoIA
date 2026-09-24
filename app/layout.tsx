import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoIA 2.0",
  description: "Plataforma inteligente de reciclaje educativo",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
