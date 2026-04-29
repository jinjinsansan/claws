"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PlanAccess } from "@/lib/plans";

interface NavItem {
  href: string;
  label: string;
  accessKey?: keyof PlanAccess;
}

const navItems: NavItem[] = [
  { href: "/members/dashboard", label: "ダッシュボード" },
  { href: "/members/videos", label: "動画ライブラリ", accessKey: "videos" },
  { href: "/members/materials", label: "資料ダウンロード", accessKey: "materials" },
  { href: "/members/community", label: "コミュニティ", accessKey: "community" },
  { href: "/members/support", label: "質問・サポート", accessKey: "support" },
  { href: "/members/jobs", label: "受発注ボード", accessKey: "jobs" },
  { href: "/members/mypage", label: "マイページ" },
];

export default function MemberSidebar({ access }: { access: PlanAccess }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <nav className="sticky top-20 space-y-1">
        {navItems.map((item) => {
          const allowed = !item.accessKey || access[item.accessKey];
          const active = pathname === item.href;

          if (!allowed) return null;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-primary font-bold border-l-2 border-primary"
                  : "text-text-muted hover:text-text-main hover:bg-surface"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
