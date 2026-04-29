import { createServerSupabaseClient } from "@/lib/supabase/server";
import Card from "@/components/ui/Card";

interface Material {
  id: string;
  title: string;
  category: string;
  file_url: string;
  plan_required: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  template: "仕様書テンプレート",
  prompt: "プロンプト集",
  reference: "参考資料",
};

export default async function MaterialsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("plan")
    .eq("email", user?.email)
    .single();

  const userPlan = profile?.plan ?? "video-only";

  const planHierarchy = ["video-only", "video-email", "zoom"];
  const userPlanIndex = planHierarchy.indexOf(userPlan);

  const { data: materials } = await supabase
    .from("materials")
    .select("id, title, category, file_url, plan_required, created_at")
    .order("created_at", { ascending: false });

  const accessibleMaterials = (materials ?? []).filter((m: Material) => {
    if (!m.plan_required) return true;
    const requiredIndex = planHierarchy.indexOf(m.plan_required);
    return userPlanIndex >= requiredIndex;
  });

  const categories = Object.keys(CATEGORY_LABELS);
  const materialsByCategory = categories.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: accessibleMaterials.filter((m: Material) => m.category === cat),
  }));

  return (
    <div>
      <h1 className="font-serif text-xl sm:text-2xl font-bold mb-2">資料ダウンロード</h1>
      <p className="text-text-muted text-sm mb-4 sm:mb-8">
        カテゴリ別に資料をダウンロードできます
      </p>

      {materialsByCategory.map(({ category, label, items }) => (
        <div key={category} className="mb-6 sm:mb-8">
          <h2 className="font-bold text-lg mb-4">{label}</h2>
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((material: Material) => (
                <Card key={material.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm">{material.title}</h3>
                    <p className="text-text-muted text-xs mt-1">
                      {new Date(material.created_at).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <a
                    href={`/api/download?path=${encodeURIComponent(material.file_url)}`}
                    className="shrink-0 bg-primary/20 hover:bg-primary/30 text-primary font-bold text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    ダウンロード
                  </a>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <p className="text-text-muted text-sm py-2">
                この分類の資料はまだ登録されていません
              </p>
            </Card>
          )}
        </div>
      ))}

      {accessibleMaterials.length === 0 && (
        <Card className="text-center py-8">
          <p className="text-text-muted">資料はまだ登録されていません</p>
        </Card>
      )}
    </div>
  );
}
