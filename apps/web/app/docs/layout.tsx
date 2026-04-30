"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SiGithub } from "react-icons/si";
import Sidebar from "./components/sidebar";
import { Menu } from "lucide-react";
import MobileDrawer from "./components/ui/mobile-drawer";
import CopyForAI from "./components/ui/copy-for-ai";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="md:hidden p-2 rounded hover:bg-white/10 focus:outline-none"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu size={22} />
            </button>
            <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
            <Link href="/docs" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                className="w-6"
                alt="PaperDB"
                width={24}
                height={24}
              />
              <p className="font-semibold">PaperDB</p>
            </Link>
            <p className="text-gray-500">Docs</p>
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-4">
            <CopyForAI />
            <Link
              href="https://github.com/mosesedem/paperdb"
              className="p-1 hover:bg-white/10 rounded-sm transition-colors"
              target="_blank"
            >
              <SiGithub size={20} />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 md:px-6">
        <aside className="hidden md:block md:w-64 md:shrink-0">
          <Sidebar />
        </aside>
        <main className="min-w-0 flex-1 pb-20">{children}</main>
      </div>
    </div>
  );
}
