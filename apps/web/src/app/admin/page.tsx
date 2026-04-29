import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Card from "@/components/ui/Card";

export default async function AdminDashboard() {
  const supabase = createServerSupabaseClient();

  const [{ count: userCount }, { count: postCount }, { count: ticketCount }, { count: jobCount }] =
    await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase.from("tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("jobs").select("*", { count: "exact", head: true }),
    ]);

  const stats = [
    { label: "会員数", value: userCount ?? 0, href: "/admin/users" },
    { label: "コミュニティ投稿", value: postCount ?? 0, href: "/admin/community" },
    { label: "未対応チケット", value: ticketCount ?? 0, href: "/admin/tickets" },
    { label: "受発注案件", value: jobCount ?? 0, href: "/admin/jobs" },
  ];

  return (
    <div>
      <h1 className="font-serif text-xl sm:text-2xl font-bold mb-4 sm:mb-8">管理者ダッシュボード</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="hover:border-primary/50 transition-colors text-center py-3 sm:py-6">
              <p className="text-2xl sm:text-3xl font-bold text-primary">{s.value}</p>
              <p className="text-text-muted text-sm mt-1">{s.label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
