import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pret A Manger | Customer Portal",
  description: "Pret A Manger account management portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-sans">
      <body className="bg-pret-bg text-pret-text antialiased">{children}</body>
    </html>
  );
}
