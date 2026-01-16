import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SignalPulse | Trading Intelligence',
  description: 'Real-time trading signals for crypto and stocks with technical indicators',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
