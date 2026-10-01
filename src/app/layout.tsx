import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
export const metadata: Metadata = {
  metadataBase: new URL("https://nopeek-whu.vercel.app"),
  title: "NOPEEK — Crack the secret. Nobody gets to peek.",
  description:
    "A multiplayer codebreaking game with a secret generated and checked inside encrypted computation on Solana. Built with Arcium.",
  applicationName: "NOPEEK",
  openGraph: {
    title: "NOPEEK",
    description: "One secret. Your friends. No peeking.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1280,
        height: 720,
        alt: "NOPEEK — One secret. Nobody gets to peek.",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
