import type { Metadata } from "next";
import type { ReactNode } from "react";
import { messages } from "@/i18n/messages";
import "./globals.css";

export const metadata: Metadata = {
  title: messages.ar.name,
  description: messages.ar.description,
  icons: { icon: "/brand-mark.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
