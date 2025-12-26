import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import {
  LayoutDashboard,
  FileText,
  Cpu,
  Play,
  Settings,
  Zap,
  FolderOpen,
} from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Model Vibe Check",
  description: "Systematic vibes-based LLM evaluation",
};

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Prompts", href: "/prompts", icon: FileText },
  { name: "Categories", href: "/categories", icon: FolderOpen },
  { name: "Models", href: "/models", icon: Cpu },
  { name: "Runs", href: "/runs", icon: Play },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="w-64 border-r bg-card flex flex-col">
            <div className="p-4 border-b">
              <Link href="/" className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                <span className="font-semibold text-lg">Model Vibe Check</span>
              </Link>
            </div>
            <nav className="flex-1 p-4">
              <ul className="space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="p-4 border-t text-xs text-muted-foreground">
              <p>Your prompts, your models, your vibes.</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="p-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
