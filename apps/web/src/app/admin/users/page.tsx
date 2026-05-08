import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "会員管理" };

export default async function AdminUsersPage() {
  const supabase = createServerSupabaseClient();

  const { data: users, count } = await supabase
    .from("users")
    .select("id, email, display_name, total_claws_count, direct_referrals_count, total_rewards_earned, is_active, telegram_user_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-cinzel text-2xl sm:text-3xl font-black text-gold-bright">
          会員管理
        </h1>
        <span className="text-text-dim text-sm">{count ?? 0} 名</span>
      </div>

      <div className="bg-bg-card border border-border-faint rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-faint text-text-dim text-left">
                <th className="p-4">メール</th>
                <th className="p-4">名前</th>
                <th className="p-4">Claws</th>
                <th className="p-4">紹介数</th>
                <th className="p-4">報酬累計</th>
                <th className="p-4">Telegram</th>
                <th className="p-4">状態</th>
                <th className="p-4">登録日</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-b border-border-faint/50 hover:bg-bg-mid/40 transition-colors">
                  <td className="p-4 font-mono text-xs">{u.email}</td>
                  <td className="p-4">{u.display_name ?? "-"}</td>
                  <td className="p-4 text-gold-bright">{u.total_claws_count}</td>
                  <td className="p-4">{u.direct_referrals_count}</td>
                  <td className="p-4">{Number(u.total_rewards_earned).toLocaleString()} USDT</td>
                  <td className="p-4">
                    {u.telegram_user_id ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-400">連携済</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-400">未連携</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded ${u.is_active ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                      {u.is_active ? "有効" : "停止"}
                    </span>
                  </td>
                  <td className="p-4 text-text-dim">{new Date(u.created_at).toLocaleDateString("ja-JP")}</td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-dim">ユーザーがいません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
