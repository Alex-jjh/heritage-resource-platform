import type { Metadata } from "next";
import Providers from "./providers";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heritage Resource Platform",
  description:
    "A community platform for sharing and discovering cultural heritage resources",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased flex min-h-screen flex-col"
      >
        <Providers>
          <Navbar />
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
