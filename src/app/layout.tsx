import type { Metadata } from "next";
import "./globals.css";
import { GameProvider } from "@/contexts/GameContext";

export const metadata: Metadata = {
  title: "The Political Playground - Fictional Election Simulator",
  description:
    "A fictional political simulation game for entertainment and educational purposes. Does not reflect real politics or endorse any political views.",
  keywords:
    "political simulation, election game, campaign simulator, educational game, fictional politics",
  robots: "index, follow",
  openGraph: {
    title: "The Political Playground - Fictional Election Simulator",
    description:
      "A fictional political simulation game for entertainment purposes only",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-stone-100 antialiased"
        style={{ background: "var(--background)" }}
      >
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
