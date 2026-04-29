"use client";

import { useState } from "react";
import Link from "next/link";

const navItems = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/announcements", label: "お知らせ" },
  { href: "/admin/videos", label: "動画管理" },
  { href: "/admin/materials", label: "資料管理" },
  { href: "/admin/users", label: "会員管理" },
  { href: "/admin/community", label: "コミュニティ" },
  { href: "/admin/tickets", label: "サポート" },
  { href: "/admin/jobs", label: "受発注" },
];

export default function AdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="lg:hidden text-text-main"
        onClick={() => setOpen(!open)}
        aria-label="管理メニュー"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {open && (
        <nav className="lg:hidden fixed top-14 sm:top-16 left-0 right-0 z-40 bg-surface border-b border-border px-4 sm:px-6 py-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-main hover:bg-bg transition-colors"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/members/dashboard"
            className="block px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-main hover:bg-bg transition-colors border-t border-border mt-2 pt-3"
            onClick={() => setOpen(false)}
          >
            会員エリアへ
          </Link>
        </nav>
      )}
    </>
  );
}
