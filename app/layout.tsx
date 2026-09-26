import type { Metadata } from 'next';
import { getLocale, getTranslations } from '@/lib/i18n/server';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { Toaster } from 'sonner';

/**
 * Built per request so the tab title and share cards follow the language the
 * visitor chose. Keywords stay in Uzbek on purpose — they target local search,
 * which does not change because one visitor switched the interface.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();

  return {
  title: t('meta.siteTitle'),
  description: t('meta.siteDescription'),
  keywords: [
    'NEW ERA',
    'NEW ERA Trading',
    'treyding akademiyasi',
    'treyding kurslari',
    'trading uzbekistan',
    'forex darslari',
    'kriptovalyuta ta\'limi',
    'Smart Money Concepts',
    'SMC strategiyasi',
    'Order Block tahlili',
    'FVG tahlili',
    'prop firm challenge',
    'treyding mentorlik',
    'Toshkent treyding',
  ],
  authors: [{ name: 'NEW ERA Trading Academy' }],
  creator: 'NEW ERA',
  publisher: 'NEW ERA',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://newera.uz'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: t('meta.siteTitle'),
    description: t('meta.ogDescription'),
    url: 'https://newera.uz',
    siteName: 'NEW ERA Trading Academy',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 800,
        alt: 'NEW ERA Logo',
      },
    ],
    locale: 'uz_UZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: t('meta.siteTitle'),
    description: t('meta.ogDescription'),
    images: ['/logo.png'],
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        '@id': 'https://newera.uz/#organization',
        name: 'NEW ERA Trading Academy',
        alternateName: 'NEW ERA',
        url: 'https://newera.uz',
        logo: {
          '@type': 'ImageObject',
          url: 'https://newera.uz/logo.png',
        },
        description:
          "O'zbekistonda professional treyding ta'lim platformasi. Bosqichma-bosqich video darslar, testlar va amaliyot.",
        sameAs: ['https://t.me/newera_trading'],
      },
      {
        '@type': 'WebSite',
        '@id': 'https://newera.uz/#website',
        url: 'https://newera.uz',
        name: 'NEW ERA',
        description: "Professional Treyding Ta'limi va Strategiyalar Platformasi",
        publisher: {
          '@id': 'https://newera.uz/#organization',
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://newera.uz/courses?search={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="shortcut icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* Schema.org Structured Data for Google Rich Snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>

      <body className="antialiased font-sans">
        <ThemeProvider>
          <I18nProvider initialLocale={locale}>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#111',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                },
              }}
            />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
