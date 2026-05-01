"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-bg-deep/80 backdrop-blur-md border-b border-border-faint">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/" className="font-cinzel text-xl font-bold text-gold">
          OPENCLAW
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/claws" className="text-text-dim hover:text-text-main transition-colors text-sm">
            Claws
          </Link>
          <Link href="/academy" className="text-text-dim hover:text-text-main transition-colors text-sm">
            Academy
          </Link>
          <Link href="/login" className="text-text-dim hover:text-text-main transition-colors text-sm">
            ログイン
          </Link>
        </nav>

        <button
          className="md:hidden text-text-main"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="メニュー"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="md:hidden bg-bg-mid border-t border-border-faint px-4 py-4 space-y-3">
          <Link href="/claws" className="block text-text-dim hover:text-text-main" onClick={() => setMenuOpen(false)}>Claws</Link>
          <Link href="/academy" className="block text-text-dim hover:text-text-main" onClick={() => setMenuOpen(false)}>Academy</Link>
          <Link href="/login" className="block text-text-dim hover:text-text-main" onClick={() => setMenuOpen(false)}>ログイン</Link>
        </nav>
      )}
    </header>
  );
}
