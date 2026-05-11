import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import NavBar from "@/components/ui/NavBar";
import PRETtyWidget from "@/components/ui/PRETtyWidget";
import { isDemoMode } from "@/lib/mock";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar userName={session.name} companyName={session.companyName} />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {children}
      </main>
      {isDemoMode() && <PRETtyWidget />}
    </div>
  );
}
