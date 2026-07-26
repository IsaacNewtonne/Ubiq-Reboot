import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ubiq Network Status",
  description:
    "Independent, live health information for the Ubiq blockchain network.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
