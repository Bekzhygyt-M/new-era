import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import AdminSidebar from './AdminSidebar';

export const metadata: Metadata = {
  title: "NEW ERA — Professional Treyding Ta'limi va Strategiyalar",
  description: "NEW ERA — O'zbekistonda professional treyding boshqaruv markazi.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('newera_session')?.value;
  let currentFullName = 'Bosh Admin';
  let currentEmail = 'admin@gmail.com';

  if (sessionCookie) {
    try {
      const parsed = JSON.parse(sessionCookie);
      if (parsed.full_name) currentFullName = parsed.full_name;
      if (parsed.email) currentEmail = parsed.email;
    } catch (e) {}
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row font-sans selection:bg-white/20 selection:text-white">
      {/* Sleek B&W Luxury Sidebar */}
      <AdminSidebar currentFullName={currentFullName} currentEmail={currentEmail} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden bg-[#080808]">
        {/* Mobile Header */}
        <header className="md:hidden bg-[#000000] border-b border-white/10 p-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
          <Link href="/admin" className="text-lg font-black text-white tracking-widest font-mono">
            NEW ERA <span className="text-xs text-white/50 border border-white/20 px-1.5 py-0.5 rounded">ADMIN</span>
          </Link>
          <Link href="/dashboard" className="text-xs font-bold text-white bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg">
            Kabinetga
          </Link>
        </header>

        <div className="flex-1 p-6 md:p-10 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
