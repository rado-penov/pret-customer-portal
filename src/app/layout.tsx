import type { Metadata } from "next";
import "./globals.css";
import { getSession } from "@/lib/auth/session";
import NavBar from "@/components/ui/NavBar";
import PRETtyWidget from "@/components/ui/PRETtyWidget";

export const metadata: Metadata = {
  title: "Pret A Manger | Customer Portal",
  description: "Pret A Manger account management portal",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en" className="font-sans">
      <body className="bg-pret-bg text-pret-text antialiased">
        {session ? (
          <div className="min-h-screen flex flex-col">
            <NavBar userName={session.name} companyName={session.companyName} />
            <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
              {children}
            </main>
            <PRETtyWidget />
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
