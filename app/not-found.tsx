import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#060606] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="font-mono text-7xl font-black text-white/20 mb-4">404</div>
      <h1 className="text-2xl font-black text-white mb-2">Sahifa topilmadi</h1>
      <p className="text-sm text-white/50 mb-6 max-w-sm">
        Siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko‘chirilgan.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-white text-black font-black text-xs uppercase tracking-wider rounded-xl transition hover:bg-neutral-200"
      >
        Bosh sahifaga qaytish
      </Link>
    </div>
  );
}
