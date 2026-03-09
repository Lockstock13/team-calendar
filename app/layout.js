import "./globals.css";
import { Inter } from "next/font/google";
import PushInit from "./components/PushInit";
import Providers from "./providers";
import { ToastProvider } from "./components/ToastProvider";
import { ConfirmProvider } from "./components/ConfirmProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Still Photo Team Calendar",
  description: "Jadwal tim fotografer Still Photo",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Still Photo",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#1e293b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        {/* PWA / Add-to-Home-Screen */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS-specific PWA tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Still Photo" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* Favicon fallback */}
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/icon-192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="512x512"
          href="/icon-512.png"
        />
      </head>
      <body className={inter.className}>
        {/* Registers /sw.js silently - no permission prompt here */}
        <PushInit />
        <ConfirmProvider>
          <ToastProvider>
            <Providers>{children}</Providers>
          </ToastProvider>
        </ConfirmProvider>
      </body>
    </html>
  );
}
