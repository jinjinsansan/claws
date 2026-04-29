"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

interface Post {
  id: string;
  category: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  user_name: string;
}

const CAT_LABELS: Record<string, string> = { "self-intro": "自己紹介", question: "質問", showcase: "作ったもの報告", general: "雑談" };

export default function AdminCommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);

  const fetchPosts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("posts")
      .select("id, category, title, body, pinned, created_at, users!posts_user_id_fkey(name)")
      .order("created_at", { ascending: false });

    setPosts(
      (data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        category: p.category as string,
        title: p.title as string,
        body: p.body as string,
        pinned: p.pinned as boolean,
        created_at: p.created_at as string,
        user_name: (p.users as { name: string } | null)?.name ?? "匿名",
      }))
    );
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleAction = async (id: string, action: "delete" | "pin" | "unpin") => {
    if (action === "delete" && !confirm("削除しますか？")) return;
    await fetch("/api/admin/delete-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: id, action }),
    });
    fetchPosts();
  };

  return (
    <div>
      <h1 className="font-serif text-xl sm:text-2xl font-bold mb-2">コミュニティモデレーション</h1>
      <p className="text-text-muted text-sm mb-4 sm:mb-6">計 {posts.length} 件</p>

      <div className="space-y-2">
        {posts.map((p) => (
          <Card key={p.id} className={p.pinned ? "border-primary/40" : ""}>
            <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                  {p.pinned && <span className="text-primary text-xs font-bold">📌</span>}
                  <span className="text-text-muted text-xs">{CAT_LABELS[p.category] ?? p.category}</span>
                  <span className="text-text-muted text-xs">{p.user_name}</span>
                  <span className="text-text-muted text-xs">{new Date(p.created_at).toLocaleDateString("ja-JP")}</span>
                </div>
                <h3 className="font-bold text-sm">{p.title}</h3>
                {p.body && <p className="text-text-muted text-xs mt-1 line-clamp-2">{p.body}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleAction(p.id, p.pinned ? "unpin" : "pin")}
                  className="text-xs text-primary hover:underline">{p.pinned ? "ピン解除" : "ピン留め"}</button>
                <button onClick={() => handleAction(p.id, "delete")}
                  className="text-xs text-red-400 hover:underline">削除</button>
              </div>
            </div>
          </Card>
        ))}
        {posts.length === 0 && <p className="text-text-muted text-sm">投稿なし</p>}
      </div>
    </div>
  );
}
