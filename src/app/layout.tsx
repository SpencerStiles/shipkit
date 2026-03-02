import type { Metadata } from 'next';
import { Syne, DM_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const syne = Syne({ subsets: ['latin'], variable: '--font-syne', display: 'swap' });
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'ShipKit — AI SaaS Starter',
  description: 'Production-ready SaaS template with AI billing, auth, and usage tracking',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmMono.variable}`}>
      <body className="bg-[#09090b] text-[#fafafa] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
