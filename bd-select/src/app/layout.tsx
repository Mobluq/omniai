import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BD Select",
  description: "Authenticated resale of premium fashion, built for Africa.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
