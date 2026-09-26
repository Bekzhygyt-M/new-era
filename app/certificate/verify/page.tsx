import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';
import VerifyClient from './VerifyClient';

export const metadata = {
  title: 'Sertifikatni tekshirish — NEW ERA',
  description: 'NEW ERA sertifikatining haqiqiyligini Certificate ID orqali tekshiring.',
};

export const dynamic = 'force-dynamic';

/** Public certificate verification (TZ §23). */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <Navbar />

      <main className="mx-auto max-w-xl px-5 pb-20 pt-28 sm:px-8">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Sertifikatni tekshirish</h1>
          <p className="mt-2 text-sm text-white/50">
            Certificate ID ni kiriting yoki sertifikatdagi QR kodni skanerlang.
          </p>
        </header>

        <VerifyClient initialId={id || ''} />
      </main>

      <Footer />
    </div>
  );
}
