import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/hooks/use-toast";
import { Toaster } from "@/components/toaster";
import { CollapsibleSidebar } from "@/components/collapsible-sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Model Vibe Check",
  description: "Systematic vibes-based LLM evaluation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <div className="flex h-screen">
            {/* Collapsible Sidebar */}
            <CollapsibleSidebar />

            {/* Main content */}
            <main className="flex-1 overflow-auto">
              <div className="p-8">{children}</div>
            </main>
          </div>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}
