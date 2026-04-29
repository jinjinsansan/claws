"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const supabase = createClient();

    if (editingId) {
      await supabase.from("announcements").update({ title: title.trim(), body: body.trim() }).eq("id", editingId);
    } else {
      await supabase.from("announcements").insert({ title: title.trim(), body: body.trim() });
    }

    setTitle("");
    setBody("");
    setEditingId(null);
    setSaving(false);
    fetchItems();
  };

  const handleEdit = (item: Announcement) => {
    setEditingId(item.id);
    setTitle(item.title);
    setBody(item.body);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    const supabase = createClient();
    await supabase.from("announcements").delete().eq("id", id);
    fetchItems();
  };

  return (
    <div>
      <h1 className="font-serif text-xl sm:text-2xl font-bold mb-4 sm:mb-6">お知らせ管理</h1>

      <Card className="mb-6 sm:mb-8">
        <h2 className="font-bold mb-4">{editingId ? "編集" : "新規作成"}</h2>
        <div className="space-y-3">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル"
            className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="本文" rows={4}
            className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors resize-none" />
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || !title.trim()}
              className="bg-primary hover:bg-primary-light text-bg font-bold text-sm px-6 py-2 rounded-lg transition-colors disabled:opacity-50">
              {saving ? "保存中..." : editingId ? "更新" : "投稿"}
            </button>
            {editingId && (
              <button onClick={() => { setEditingId(null); setTitle(""); setBody(""); }}
                className="text-text-muted hover:text-text-main text-sm px-4 py-2">キャンセル</button>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-text-muted text-xs">{new Date(item.created_at).toLocaleDateString("ja-JP")}</p>
              <h3 className="font-bold text-sm">{item.title}</h3>
              {item.body && <p className="text-text-muted text-sm mt-1 line-clamp-2">{item.body}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => handleEdit(item)} className="text-xs text-primary hover:underline">編集</button>
              <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:underline">削除</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
