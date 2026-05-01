export const metadata = { title: "管理者ダッシュボード" };

/**
 * /admin - Phase 7 で本格実装予定
 *
 * Phase 7 で NFT 販売状況・紹介報酬管理・ユーザー管理・通知管理等を構築。
 */
export default function AdminDashboardPage() {
  return (
    <div className="text-center py-20">
      <div className="text-red-bright font-cinzel text-xs tracking-[0.6em] mb-6">◆ COMING SOON ◆</div>
      <h1 className="font-cinzel text-3xl md:text-5xl font-black text-gold-bright mb-6">管理者ダッシュボード</h1>
      <p className="text-text-dim text-base leading-relaxed max-w-lg mx-auto">
        NFT 販売管理、紹介報酬管理、ユーザー管理、通知管理は Phase 7 で実装予定です。
      </p>
    </div>
  );
}
