import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gatra",
  description: "Rekap keuanganmu, tersusun jelas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
