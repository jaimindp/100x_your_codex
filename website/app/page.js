'use client';

import { useMemo } from 'react';

const DOWNLOADS = {
  mac: process.env.NEXT_PUBLIC_DOWNLOAD_MAC || '#',
  windows: process.env.NEXT_PUBLIC_DOWNLOAD_WINDOWS || '#',
  linux: process.env.NEXT_PUBLIC_DOWNLOAD_LINUX || '#'
};

function getPlatform() {
  if (typeof window === 'undefined') return 'mac';
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('linux')) return 'linux';
  return 'mac';
}

export default function Home() {
  const platform = useMemo(getPlatform, []);
  const primaryLabel =
    platform === 'windows'
      ? 'Download for Windows'
      : platform === 'linux'
        ? 'Download for Linux'
        : 'Download for macOS';

  const primaryHref = DOWNLOADS[platform];
  const downloadsReady = primaryHref !== '#';

  return (
    <main className="page">
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />
      <section className="hero">
        <h1>100x Codex</h1>
        <a
          className={`cta ${downloadsReady ? '' : 'disabled'}`}
          href={primaryHref}
          aria-disabled={!downloadsReady}
        >
          {downloadsReady ? primaryLabel : 'Download coming soon'}
        </a>
      </section>
    </main>
  );
}
