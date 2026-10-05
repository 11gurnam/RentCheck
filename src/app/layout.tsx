import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentCheck — A little more clarity before you move",
  description:
    "An India-wide accommodation research prototype built around tenant experiences, property ratings and landlord reputations.",
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
