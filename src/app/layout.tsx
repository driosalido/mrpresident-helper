import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mr President — Opponent Procedure Assistant',
  description: 'Guided wizard for Russia Acts and China Acts (GMT Games, 2nd Edition)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Apply saved theme before first paint to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('mrpres.theme.v1');
            if (t === 'dark') document.documentElement.classList.add('dark');
          } catch(e) {}
        `}} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
