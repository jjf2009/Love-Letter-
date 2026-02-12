import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Encrypted Love Letters",
  description: "Send encrypted love letters that can only be opened with a magic link.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-dvh bg-gradient-to-b from-rose-50 to-pink-100 text-slate-950">
          <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-6 py-10">
            <header className="flex items-center justify-between gap-4">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                Encrypted Love Letters
              </Link>
              <nav className="flex items-center gap-3 text-sm">
                <Link
                  className="rounded-full px-3 py-2 text-slate-700 hover:bg-white/50"
                  href="/create"
                >
                  Create
                </Link>
              </nav>
            </header>

            <main className="flex-1 py-10">{children}</main>

            <footer className="text-xs text-slate-600">
              Keys are stored only in the URL fragment and never sent to the server.
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
