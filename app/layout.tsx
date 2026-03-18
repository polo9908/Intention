import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ContextLayer",
    template: "%s | ContextLayer",
  },
  description:
    "Multi-agent orchestration platform for AI teams. Coordinate, monitor, and scale your AI agents with precision.",
  keywords: ["AI", "multi-agent", "orchestration", "LLM", "Claude"],
  authors: [{ name: "ContextLayer" }],
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e27",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
