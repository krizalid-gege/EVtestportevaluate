import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "MY-EV CPO | Malaysia 20kW DC Charging Platform (Phase 1A)",
  description:
    "Malaysia EV CPO Phase 1A Mobile QR Charging PWA (EN / BM / 中文) & Chinese Operations Console for Techone GPEV20-BG102-S1P-EA 20kW DC Chargers + QuanYao QY-SECC-02.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <div className="app-shell">
            <Navbar />
            <main style={{ flex: 1 }}>{children}</main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
