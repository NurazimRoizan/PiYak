import type { Metadata } from "next";
import Link from "next/link";

const DESCRIPTION = "What PiYak collects, why, and who can see it: your account, tracker and partner data.";
const CONTACT_EMAIL = "support@jimiroi.com";

export const metadata: Metadata = {
  title: "Privacy Policy | PiYak",
  description: DESCRIPTION,
  // Overrides the homepage canonical inherited from layout.tsx
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    title: "Privacy Policy | PiYak",
    description: DESCRIPTION,
    url: "/privacy-policy",
    siteName: "PiYak",
    type: "website",
  },
};

export default function PrivacyPolicy() {
  const email = (
    <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#00FFFF] underline hover:text-white">
      {CONTACT_EMAIL}
    </a>
  );

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)] p-4 sm:p-8 pb-20 mt-8">
      <article className="w-full max-w-[800px] bg-black border-8 border-white p-6 md:p-10 shadow-[16px_16px_0_0_#00FFFF]">
        <Link href="/" className="inline-block text-sm font-extrabold uppercase text-[#00FFFF] underline hover:text-white mb-6">
          &larr; Back to PiYak
        </Link>

        <h1 className="text-4xl md:text-6xl font-extrabold text-white uppercase tracking-tighter mb-2">
          Privacy Policy
        </h1>
        <p className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-10">
          Last updated: 23 September 2026
        </p>

        <div className="space-y-10 text-gray-300 text-sm md:text-base leading-relaxed">
          <p>
            PiYak is a personal project built and run by Nurazim Roizan (
            <a href="https://jimiroi.com" className="text-[#00FFFF] underline hover:text-white">Jimi Roi</a>
            ). This policy explains what PiYak collects when you use piyak.jimiroi.com, why, and who can
            see it. Questions? Email {email}.
          </p>

          <section>
            <h2 className="text-xl md:text-2xl font-extrabold text-[#FFFF00] uppercase mb-3">What we collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white">Account details.</strong>{' '}Sign-in is handled by Clerk, which stores
                the details you sign up with, such as your email address, username or name, and profile photo.
                PiYak never sees your password.
              </li>
              <li>
                <strong className="text-white">What you track.</strong>{' '}Your daily poop counts, the days your
                period starts and ends, your cycle settings (period length and cycle length) and which mode you use.
              </li>
              <li>
                <strong className="text-white">Partner links.</strong>{' '}Your invite code, and which account you have
                linked to.
              </li>
              <li>
                <strong className="text-white">Trophies.</strong>{' '}Which achievements you have unlocked, and when.
              </li>
              <li>
                <strong className="text-white">Notifications.</strong>{' '}In-app messages such as &ldquo;Your partner
                just logged a poop!&rdquo;. If you turn on push notifications, we also store your browser&rsquo;s push
                subscription: a delivery address and keys that let us send you alerts.
              </li>
              <li>
                <strong className="text-white">On your device.</strong>{' '}Your mode and period settings are saved in
                your browser&rsquo;s local storage, and Clerk uses cookies to keep you signed in.
              </li>
              <li>
                <strong className="text-white">Technical data.</strong>{' '}When you link to a partner, we log the event
                with your approximate city and country (worked out from your IP address) and your browser&rsquo;s
                user agent. When a new account is created, we log that a sign-up happened, with no personal details.
                Our hosting provider also keeps standard server logs.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-extrabold text-[#FFFF00] uppercase mb-3">How we use it</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To run your tracker, calendar, streaks and trophies.</li>
              <li>
                To sync with your partner and send the notifications you have turned on, including partner alerts
                and the monthly Yak Wrapped reminder.
              </li>
              <li>To keep PiYak working and secure, and to see how many people sign up and link partners.</li>
            </ul>
            <p className="mt-3">We don&rsquo;t sell your data, and we don&rsquo;t show ads.</p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-extrabold text-[#FFFF00] uppercase mb-3">Who can see your data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white">You.</strong>
              </li>
              <li>
                <strong className="text-white">Anyone who links to you.</strong>{' '}When someone enters your invite
                code, they can view your tracker calendar, cycle info and trophies, see your username and profile
                photo, and get an alert each time you log a poop. They can&rsquo;t change your data. Linking is
                one-way, so you only see their data if you also enter their code. Share your code only with people
                you trust. Only the person who linked can disconnect, so to remove someone who linked to you,
                email {email}.
              </li>
              <li>
                <strong className="text-white">Service providers</strong>{' '}that run PiYak for us:
                <ul className="list-[circle] pl-5 mt-2 space-y-1">
                  <li>Clerk, for sign-in and accounts.</li>
                  <li>Vercel, for hosting. Vercel also works out your approximate location from your IP address.</li>
                  <li>Our PostgreSQL database provider, which stores your tracker data.</li>
                  <li>Your browser&rsquo;s push service (such as Google, Apple, Microsoft or Mozilla), which delivers push notifications.</li>
                  <li>Discord, where our internal sign-up and partner-link alerts are posted.</li>
                </ul>
                <p className="mt-2">These providers may process data outside your country.</p>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-extrabold text-[#FFFF00] uppercase mb-3">Keeping and deleting your data</h2>
            <p>
              We keep your data for as long as you have an account. To delete your account and all your tracker
              data, email {email} from the email address on your account. We will delete your data and confirm
              by email within 30 days.
            </p>
            <p className="mt-3">
              You can remove the data stored on your device at any time by clearing your browser&rsquo;s site data
              for piyak.jimiroi.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-extrabold text-[#FFFF00] uppercase mb-3">Security</h2>
            <p>
              Sign-in is handled by Clerk, and data travels over encrypted HTTPS connections. Your tracker data is
              only shown to you and to anyone linked to you. No online service can promise perfect security, so
              please keep your sign-in details safe.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-extrabold text-[#FFFF00] uppercase mb-3">Children</h2>
            <p>
              PiYak isn&rsquo;t meant for children under 13, and we don&rsquo;t knowingly collect their data. If you
              think a child has made an account, email {email} and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-extrabold text-[#FFFF00] uppercase mb-3">Changes to this policy</h2>
            <p>If this policy changes, we will update the date at the top of this page.</p>
          </section>
        </div>
      </article>
    </div>
  );
}
