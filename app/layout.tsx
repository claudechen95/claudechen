import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "./components/PostHogProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Claude Chen",
  description: "Ask me anything.",
  openGraph: {
    title: "Claude Chen",
    description: "Ask me anything.",
    url: "https://claudechen.me",
    siteName: "Claude Chen",
    images: [{ url: "https://claudechen.me/preview.png", width: 754, height: 1190 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Chen",
    description: "Ask me anything.",
    images: ["https://claudechen.me/preview.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-[#F8F7F3]">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
