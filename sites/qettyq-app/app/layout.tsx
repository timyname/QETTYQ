import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QETTYQ APP — Astana pilot",
  description: "Персональный навигатор по событиям, местам и свободному времени в Астане.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
