import type { Metadata } from "next";
import "./globals.css";
import { GameProvider } from "@/contexts/GameContext";

export const metadata: Metadata = {
  title: "The Campaign Tribune - Election Simulator",
  description: "Live election coverage and campaign headquarters simulation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-100 antialiased" style={{ background: 'var(--background)' }}>
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
