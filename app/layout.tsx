import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HR Assistant Admin",
  description: "Admin dashboard for the Telegram HR policy assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
