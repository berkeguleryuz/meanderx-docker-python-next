import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const display = localFont({
  src: [
    { path: "./fonts/ClashGrotesk-Regular.woff2", weight: "400" },
    { path: "./fonts/ClashGrotesk-Medium.woff2", weight: "500" },
    { path: "./fonts/ClashGrotesk-Semibold.woff2", weight: "600" },
  ],
  variable: "--font-display",
});

const body = localFont({
  src: [
    { path: "./fonts/CabinetGrotesk-Regular.woff2", weight: "400" },
    { path: "./fonts/CabinetGrotesk-Medium.woff2", weight: "500" },
    { path: "./fonts/CabinetGrotesk-Bold.woff2", weight: "700" },
  ],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "ConEd Hosting Capacity Explorer",
  description: "Query Con Edison hosting capacity by feeder and substation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
