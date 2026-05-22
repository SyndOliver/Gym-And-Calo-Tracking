import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import RestTimer from "@/components/RestTimer";
import { ActiveWorkoutProvider } from "@/components/ActiveWorkoutProvider";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gym Tracker - Theo dõi tập luyện",
  description: "Ứng dụng theo dõi buổi tập gym: bài tập, sets, reps, volume, đồng hồ nghỉ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gym",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0d18",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`dark ${inter.variable}`}>
      <body className="min-h-dvh font-sans">
        <ActiveWorkoutProvider>
          <main className="mx-auto w-full max-w-2xl px-3 pb-32 pt-3 sm:px-4 sm:pt-6">
            {children}
          </main>
          <RestTimer />
          <BottomNav />
        </ActiveWorkoutProvider>
      </body>
    </html>
  );
}
