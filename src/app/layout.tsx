import type { Metadata, Viewport } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const playfair = Playfair_Display({
  subsets:  ['latin'],
  variable: '--font-display',
  weight:   ['400', '500'],
  style:    ['normal', 'italic'],
});

const dmSans = DM_Sans({
  subsets:  ['latin'],
  variable: '--font-sans',
  weight:   ['300', '400', '500'],
});

export const viewport: Viewport = {
  width:               'device-width',
  initialScale:        1,
  maximumScale:        1,
  userScalable:        false,
  viewportFit:         'cover',  // safe area para iPhone com notch
  themeColor:          '#FAFAF8',
};

export const metadata: Metadata = {
  title:       'AAAgenda',
  description: 'Agende no momento certo. Horas Planetárias para sua semana.',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:           true,
    statusBarStyle:    'default',
    title:             'AAAgenda',
  },
  icons: {
    icon:  '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${dmSans.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
