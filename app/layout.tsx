import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sample Store",
  description: "A sample e-commerce storefront and back office.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
