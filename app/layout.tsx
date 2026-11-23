import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import RouteProgress from "@/components/route-progress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Iuran Pengadaan Portal Lingkungan",
  description:
    "Aplikasi transparansi rekap iuran swadaya warga untuk pemasangan portal lingkungan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800">
        <RouteProgress />
        {children}
      </body>
    </html>
  );
}
