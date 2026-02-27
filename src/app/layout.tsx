import type { Metadata } from "next";
import "./globals.css";
import 'react-phone-input-2/lib/style.css';
import LayoutWrapper from "@/components/LayoutWrapper";
import { BrandProvider } from "@/lib/brand-context";

export const metadata: Metadata = {
  title: "MSABER - Auction Management System",
  description: "Admin dashboard for auction management and invoicing",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ "--sidebar-width": "256px" } as React.CSSProperties}>
      <body className="font-sans" suppressHydrationWarning={true}>
        <BrandProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </BrandProvider>
      </body>
    </html>
  );
}
