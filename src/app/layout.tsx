import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ShipKit — AI SaaS Starter',
  description: 'Production-ready SaaS template with AI billing, auth, and usage tracking',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
