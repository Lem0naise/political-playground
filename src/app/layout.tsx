import type { Metadata } from "next";
import "./globals.css";
import { GameProvider } from "@/contexts/GameContext";

export const metadata: Metadata = {
  title: "Election Campaign Simulator",
  description: "Interactive electoral simulation game where you manage a political campaign",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100 antialiased">
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
