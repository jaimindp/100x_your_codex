import './globals.css';

export const metadata = {
  title: '100x Codex',
  description: 'Download the 100x Codex desktop app.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
