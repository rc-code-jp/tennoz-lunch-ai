import type { Metadata } from "next";
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
  title: "天王洲アイルランチAI - AIがおすすめのランチを提案",
  description:
    "あなたの気分と今日の天気から、天王洲アイルエリアで最適なランチをAIが提案します。",
  openGraph: {
    title: "天王洲アイルランチAI - AIがおすすめのランチを提案",
    description:
      "あなたの気分と今日の天気から、天王洲アイルエリアで最適なランチをAIが提案します。",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "天王洲アイルランチAI",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "天王洲アイルランチAI - AIがおすすめのランチを提案",
    description:
      "あなたの気分と今日の天気から、天王洲アイルエリアで最適なランチをAIが提案します。",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
