import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "通知管理" };

export default async function AdminNotificationsPage() {
  const supabase = createServerSupabaseClient();

  const { data: notifications } = await supabase
    .from("push_notifications")
    .select("id, title, notification_type, target_type, status, total_targets, total_delivered, total_failed, scheduled_for, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const typeLabel: Record<string, string> = {
    announcement: "お知らせ",
    promotion: "キャンペーン",
    system: "システム",
    personal: "個人",
  };

  const targetLabel: Record<string, string> = {
    all: "全員",
    specific_users: "指定ユーザー",
    by_claw: "Claw所有者",
    by_tier: "ティア指定",
  };

  const statusStyle: Record<string, string> = {
    draft: "bg-gray-800/50 text-gray-400",
    scheduled: "bg-blue-900/30 text-blue-400",
    sending: "bg-yellow-900/30 text-yellow-400",
    sent: "bg-green-900/30 text-green-400",
    failed: "bg-red-900/30 text-red-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-cinzel text-2xl sm:text-3xl font-black text-gold-bright">
          通知管理
        </h1>
        <Link
          href="/admin/announcements/new"
          className="px-4 py-2 bg-red-blood hover:bg-red-bright text-text-main text-sm font-bold rounded transition-colors border border-gold/40"
        >
          + 新規通知
        </Link>
      </div>

      <div className="bg-bg-card border border-border-faint rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-faint text-text-dim text-left">
                <th className="p-4">タイトル</th>
                <th className="p-4">タイプ</th>
                <th className="p-4">配信先</th>
                <th className="p-4">ステータス</th>
                <th className="p-4">配信/対象</th>
                <th className="p-4">作成日</th>
              </tr>
            </thead>
            <tbody>
              {(notifications ?? []).map((n) => (
                <tr key={n.id} className="border-b border-border-faint/50 hover:bg-bg-mid/40 transition-colors">
                  <td className="p-4 font-bold">{n.title}</td>
                  <td className="p-4">{typeLabel[n.notification_type] ?? n.notification_type}</td>
                  <td className="p-4">{targetLabel[n.target_type] ?? n.target_type}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusStyle[n.status] ?? ""}`}>
                      {n.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-green-400">{n.total_delivered}</span>
                    {n.total_failed > 0 && <span className="text-red-400 ml-1">(失敗:{n.total_failed})</span>}
                    <span className="text-text-dim"> / {n.total_targets}</span>
                  </td>
                  <td className="p-4 text-text-dim">{new Date(n.created_at).toLocaleDateString("ja-JP")}</td>
                </tr>
              ))}
              {(!notifications || notifications.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-dim">通知がありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
