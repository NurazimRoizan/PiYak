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
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebApplication",
                  "@id": "https://piyak.jimiroi.com/#app",
                  "name": "PiYak",
                  "url": "https://piyak.jimiroi.com",
                  "description": "The most unhinged, brutalist daily tracker. Sync your poops, track your periods, earn wild achievements, and get judged by a sentient Toilet Boss.",
                  "applicationCategory": "HealthApplication",
                  "operatingSystem": "All",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                  }
                },
                {
                  "@type": "FAQPage",
                  "@id": "https://piyak.jimiroi.com/#faq",
                  "mainEntity": [
                    {
                      "@type": "Question",
                      "name": "What is PiYak and why is it gamified?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "PiYak is a gamified, neo-brutalist bodily tracker for couples and individuals to track bowel movements and menstrual cycles with achievements, streaks, and partner sync push notifications."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "How does partner synchronization work?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Each user gets a private invite code. Once linked, couples can view shared habit calendars, stay updated on cycle phases, and receive instant push notifications."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Can I track both bowel movements and menstrual cycles?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes. PiYak features seamless dual-mode switching to track bowel movements or switch to the period tracker to monitor cycle lengths and flow days."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Is PiYak free and can it be installed on mobile?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes, PiYak is 100% free and built as a Progressive Web App (PWA). You can install it on iOS via Safari 'Add to Home Screen' or Android via Chrome for an offline-ready native app experience."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Is my personal health data private and secure?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes. Your personal logs are strictly accessible by you and your authorized linked partner. PiYak uses enterprise-grade Clerk authentication and encrypted database connections."
                      }
                    }
                  ]
                }
              ]
            })
          }}
        />
      </head>
      <body className="min-h-full flex flex-col animate-fade-in bg-black">
        <ClerkProvider appearance={{ baseTheme: dark }}>
          {children}
          <NotificationToaster />
          <ServiceWorkerRegister />
        </ClerkProvider>
      </body>
    </html>
  );
}
