import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PiYak - Poop & Period Tracker",
  description: "Track your poops and periods with style.",
  manifest: "/manifest.json",
  icons: {
    icon: "/images/icon-192x192.png",
    apple: "/images/icon-192x192.png",
  },
  themeColor: "#000000",
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
        <ClerkProvider>
          {children}
          <NotificationToaster />
        </ClerkProvider>
      </body>
    </html>
  );
}
