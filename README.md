# PiYak 💩🩸

PiYak is a highly unhinged, neo-brutalist Progressive Web App (PWA) designed to track your daily bowel movements and menstrual cycles. Why track it in a boring medical app when you can be judged by an aggressive "Toilet Boss" and earn wild gamified achievements?

## Features

- **Dual Modes**: Track both "POOP" and "BLOOD" seamlessly.
- **Neo-Brutalist UI**: High contrast, thick borders, aggressive shadows, and chaotic colors.
- **Partner Sync (Spy Mode)**: Connect with your partner to see their logs. Synchronize your bathroom visits and menstrual cycles to unlock rare meta-achievements.
- **The Achievement System**: 18 wild achievements to unlock including `The Regular`, `Shark Week`, `God Tier`, and a 0.1% chance `Gacha Whale`.
- **Yak Wrapped**: A monthly, animated, Spotify-Wrapped-style breakdown of your payloads dropped, titanium bowels, and biological status.
- **Aggressive Status Bar**: A highly opinionated status bar that judges your daily performance and delivers Gen Z brainrot jokes when appropriate.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router)
- **Styling**: Tailwind CSS (Neo-Brutalist Theme)
- **Database**: PostgreSQL (via Prisma)
- **Authentication**: [Clerk](https://clerk.com)
- **Notifications**: Web Push API & Vercel Cron Jobs

## Getting Started

First, install dependencies:

```bash
npm install
```

Set up your `.env` file with your Clerk keys and Postgres URL. Then, push the schema:

```bash
npx prisma db push
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy on Vercel

The easiest way to deploy PiYak is to use the [Vercel Platform](https://vercel.com/new). Make sure to configure the `CRON_SECRET` environment variable for the automated Yak Wrapped push notifications.

---
*PiYak: Because your bathroom habits deserve to be gamified.*
