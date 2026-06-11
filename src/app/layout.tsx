import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LimArt Check In",
  description: "Hệ thống quản lý nội bộ",
  icons: {
    icon: '/capybara_mascot.png',
    apple: '/capybara_mascot.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LimArt",
  },
};

export const viewport = {
  themeColor: "#0f172a",
};

import NextTopLoader from 'nextjs-toploader';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Thêm chút CSS nền Capybara cho toàn khung body nếu cần, hiện tại đang xài nền CSS background-color bên trong. Ta thêm watermark nhẹ */}
      <body className={`${inter.className} bg-[url(/capybara_bg.png)] bg-fixed bg-cover bg-center before:absolute before:inset-0 before:-z-10 before:bg-white/85 dark:before:bg-black/90`}>
        <NextTopLoader color="#EA580C" shadow="0 0 10px #EA580C,0 0 5px #EA580C" showSpinner={false} />
        {children}
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
