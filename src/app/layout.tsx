import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LimArt Check In",
  description: "Hệ thống chấm công & quản lý nội bộ LimArt",
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  }
};

import NextTopLoader from 'nextjs-toploader';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NextTopLoader color="#059669" shadow="0 0 10px #059669,0 0 5px #059669" showSpinner={false} />
        {children} {/* Children must be below provider if any */}
        <Toaster />
      </body>
    </html>
  );
}
