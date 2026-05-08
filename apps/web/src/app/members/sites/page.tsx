import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "HP管理" };

export default async function MemberSitesPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sites } = await supabase
    .from("user_sites")
    .select("id, subdomain, business_name, business_type, template_name, status, deployed_at, view_count, created_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const statusStyle: Record<string, string> = {
    draft: "bg-gray-800/50 text-gray-400",
    published: "bg-green-900/30 text-green-400",
    suspended: "bg-red-900/30 text-red-400",
  };

  const statusLabel: Record<string, string> = {
    draft: "生成中",
    published: "公開中",
    suspended: "停止中",
  };

  return (
    <div>
      <h1 className="font-cinzel text-2xl sm:text-3xl font-black text-gold-bright mb-8">
        HP 管理
      </h1>

      {(!sites || sites.length === 0) ? (
        <div className="bg-bg-card border border-border-faint rounded-lg p-10 text-center">
          <p className="text-text-dim mb-4">まだ HP が生成されていません。</p>
          <p className="text-text-dim text-sm">
            Telegram Bot で担当 Claw に「HP を作って」と話しかけると生成できます。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sites.map((site) => {
            const siteUrl = `https://${site.subdomain}.claws.openclaw.com`;
            return (
              <div
                key={site.id}
                className="bg-bg-card border border-border-faint rounded-lg p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="font-bold text-text-main truncate">{site.business_name}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${statusStyle[site.status] ?? ""}`}>
                        {statusLabel[site.status] ?? site.status}
                      </span>
                    </div>
                    <p className="text-text-dim text-sm mb-1">{site.business_type}</p>
                    <p className="text-text-dim text-xs mb-3">
                      テンプレート: {site.template_name}
                    </p>
                    {site.status === "published" && (
                      <a
                        href={siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold text-sm hover:underline break-all"
                      >
                        {siteUrl} →
                      </a>
                    )}
                    {site.status === "suspended" && (
                      <p className="text-red-400 text-xs">
                        NFT の所有権が変更されたため停止されています。再購入で復活できます。
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 text-xs text-text-dim">
                    <span>閲覧数: {site.view_count}</span>
                    {site.deployed_at && (
                      <span>
                        デプロイ: {new Date(site.deployed_at).toLocaleDateString("ja-JP")}
                      </span>
                    )}
                    <span>
                      作成: {new Date(site.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-text-dim text-xs mt-6">
        HP の内容を変更したい場合は、Bot で担当 Claw に「HP を更新して」と依頼してください。
      </p>
    </div>
  );
}
