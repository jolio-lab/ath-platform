import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ATH — Trade by the stars",
  description: "Cosmic Fleet · AI trading on Hyperliquid · Non-custodial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}

function Nav() {
  return (
    <nav className="border-b border-[color:var(--border)] bg-[color:var(--void)]/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold tracking-tight text-lg"
        >
          <PolarisStar />
          ATH
        </Link>
        <div className="flex items-center gap-5 text-sm text-[color:var(--meteor)]">
          <Link
            href="/#fleet"
            className="hover:text-[color:var(--starlight)] hidden sm:inline"
          >
            Fleet
          </Link>
          <Link
            href="/lab"
            className="hover:text-[color:var(--starlight)]"
          >
            Lab
          </Link>
        </div>
      </div>
    </nav>
  );
}

function PolarisStar() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="opacity-90"
    >
      <path
        d="M10 1 L11.5 8.5 L19 10 L11.5 11.5 L10 19 L8.5 11.5 L1 10 L8.5 8.5 Z"
        fill="var(--polaris)"
      />
    </svg>
  );
}
