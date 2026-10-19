import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QETTYQ — куда пойти в Астане",
  description: "Подберём занятие по интересам, времени и маршруту.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
