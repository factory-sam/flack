import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flack",
  description: "Low-latency team chat for one organization"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
