"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

interface Material {
  id: string;
  title: string;
  category: string;
  file_url: string;
  plan_required: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "template", label: "仕様書テンプレート" },
  { value: "prompt", label: "プロンプト集" },
  { value: "reference", label: "参考資料" },
];

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("template");
  const [planRequired, setPlanRequired] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchMaterials = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("materials").select("*").order("created_at", { ascending: false });
    setMaterials(data ?? []);
  }, []);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  const handleUpload = async () => {
    if (!title.trim() || !file) return;
    setSaving(true);
    const supabase = createClient();

    const filePath = `${category}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("materials").upload(filePath, file);

    if (!uploadError) {
      await supabase.from("materials").insert({
        title: title.trim(), category, file_url: filePath,
        plan_required: planRequired || null,
      });
    }

    setTitle(""); setFile(null); setPlanRequired("");
    setSaving(false); fetchMaterials();
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm("削除しますか？")) return;
    const supabase = createClient();
    await supabase.storage.from("materials").remove([fileUrl]);
    await supabase.from("materials").delete().eq("id", id);
    fetchMaterials();
  };

  return (
    <div>
      <h1 className="font-serif text-xl sm:text-2xl font-bold mb-4 sm:mb-6">資料管理</h1>

      <Card className="mb-6 sm:mb-8">
        <h2 className="font-bold mb-4">資料をアップロード</h2>
        <div className="space-y-3">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル"
            className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary" />
          <div className="grid sm:grid-cols-2 gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="bg-bg border border-border rounded-lg px-4 py-3 text-text-main focus:outline-none focus:border-primary">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={planRequired} onChange={(e) => setPlanRequired(e.target.value)}
              className="bg-bg border border-border rounded-lg px-4 py-3 text-text-main focus:outline-none focus:border-primary">
              <option value="">全プラン</option>
              <option value="video-only">動画のみ以上</option>
              <option value="video-email">メール付以上</option>
              <option value="zoom">Zoom型のみ</option>
            </select>
          </div>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-border file:text-text-muted file:bg-surface file:cursor-pointer" />
          <button onClick={handleUpload} disabled={saving || !title.trim() || !file}
            className="bg-primary hover:bg-primary-light text-bg font-bold text-sm px-6 py-2 rounded-lg disabled:opacity-50">
            {saving ? "アップロード中..." : "アップロード"}
          </button>
        </div>
      </Card>

      <div className="space-y-2">
        {materials.map((m) => (
          <Card key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <h3 className="font-bold text-sm">{m.title}</h3>
              <p className="text-text-muted text-xs">
                {CATEGORIES.find((c) => c.value === m.category)?.label} | {m.plan_required || "全プラン"} | {new Date(m.created_at).toLocaleDateString("ja-JP")}
              </p>
            </div>
            <button onClick={() => handleDelete(m.id, m.file_url)} className="text-xs text-red-400 hover:underline shrink-0">削除</button>
          </Card>
        ))}
        {materials.length === 0 && <p className="text-text-muted text-sm">資料なし</p>}
      </div>
    </div>
  );
}
