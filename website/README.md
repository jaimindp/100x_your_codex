# 100x Codex Website

Simple landing/download page built with Next.js.

## Run locally

```bash
cd website
npm install
npm run dev
```

Open http://localhost:3000

## Configure download links

Copy `.env.example` to `.env.local` and update URLs:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_DOWNLOAD_MAC`
- `NEXT_PUBLIC_DOWNLOAD_WINDOWS`
- `NEXT_PUBLIC_DOWNLOAD_LINUX`

## Build

```bash
npm run build
npm run start
```
