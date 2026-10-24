import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MentorMatch",
  description: "Find a mentor who opted in to help, with a transparent, fairness-tested match and a plan for your first conversation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:p-2">
          Skip to content
        </a>
        <Nav />
        <main id="main" className="flex-1 py-8 sm:py-12">
          {children}
        </main>
        <footer className="wrap pb-8 text-xs text-muted">
          Hackathon prototype. All 50 mentors are fictional, synthetic profiles. We prepare you; you decide and send every message yourself.
        </footer>
      </body>
    </html>
  );
}
