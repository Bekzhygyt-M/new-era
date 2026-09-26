/**
 * Next.js instrumentation hook — runs once per server process on boot.
 *
 * The import must sit *inside* the runtime check: Next inlines
 * process.env.NEXT_RUNTIME per bundle, so this branch is eliminated from the
 * edge build and lib/local-db's `fs`/`path` imports never reach it.
 *
 * The Telegram bot is intentionally NOT started here: it runs either as a
 * webhook (/api/telegram/webhook) or as a dedicated process (`npm run bot`),
 * so the web server's event loop stays free.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { seedCatalog } = await import('@/lib/content/seed');
    seedCatalog();
  }
}
