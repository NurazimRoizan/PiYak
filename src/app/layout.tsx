import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://piyak.jimiroi.com/"),
  title: "PiYak | Gamified Poop & Period Tracker for Couples",
  description: "The most unhinged, brutalist daily tracker. Sync your poops, track your periods, earn wild achievements, and get judged by a sentient Toilet Boss.",
  keywords: ["poop tracker", "period tracker", "couples tracker", "habit tracker", "neo-brutalist app", "funny tracker app", "piyak", "health gamification", "bowel movement tracker", "menstrual cycle tracker"],
  authors: [{ name: "PiYak Team" }],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "PiYak | Gamified Poop & Period Tracker",
    description: "Track your bodily functions. Sync with your partner. Earn wild achievements. The ultimate unhinged daily tracker.",
    url: "https://piyak.jimiroi.com/",
    siteName: "PiYak",
    images: [
      {
        url: "/images/icon-192x192.png",
        width: 192,
        height: 192,
        alt: "PiYak App Icon",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "PiYak | Gamified Poop & Period Tracker",
    description: "Track your bodily functions. Sync with your partner. Earn wild achievements. The ultimate unhinged daily tracker.",
    images: ["/images/icon-192x192.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/images/icon-192x192.png",
    apple: "/images/icon-192x192.png",
  },
};

import NotificationToaster from "@/components/NotificationToaster";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} h-full antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preload" href="/images/loader.PNG" as="image" />
      </head>
      <body className="min-h-full flex flex-col animate-fade-in bg-black">
        <ClerkProvider appearance={{ baseTheme: dark }}>
          {children}
          <NotificationToaster />
        </ClerkProvider>
      </body>
    </html>
  );
}
