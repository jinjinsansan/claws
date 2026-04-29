"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

interface Video {
  id: string;
  week: number;
  title: string;
  description: string | null;
  cloudflare_video_id: string | null;
  unlocked_at: string | null;
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [week, setWeek] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoId, setVideoId] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchVideos = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("videos").select("*").order("week").order("created_at");
    setVideos(data ?? []);
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("videos").insert({
      week, title: title.trim(), description: description.trim() || null,
      cloudflare_video_id: videoId.trim() || null, unlocked_at: null,
    });
    setTitle(""); setDescription(""); setVideoId("");
    setSaving(false); fetchVideos();
  };

  const handleUnlock = async (id: string, current: string | null) => {
    const supabase = createClient();
    await supabase.from("videos").update({
      unlocked_at: current ? null : new Date().toISOString(),
    }).eq("id", id);
    fetchVideos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    const supabase = createClient();
    await supabase.from("videos").delete().eq("id", id);
    fetchVideos();
  };

  const weeks = Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <div>
      <h1 className="font-serif text-xl sm:text-2xl font-bold mb-4 sm:mb-6">動画管理</h1>

      <Card className="mb-6 sm:mb-8">
        <h2 className="font-bold mb-4">動画を追加</h2>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <select value={week} onChange={(e) => setWeek(Number(e.target.value))}
              className="bg-bg border border-border rounded-lg px-4 py-3 text-text-main focus:outline-none focus:border-primary">
              {weeks.map((w) => <option key={w} value={w}>Week {w}</option>)}
            </select>
            <input type="text" value={videoId} onChange={(e) => setVideoId(e.target.value)}
              placeholder="Cloudflare Video ID" className="bg-bg border border-border rounded-lg px-4 py-3 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary" />
          </div>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル"
            className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="説明（任意）" rows={2}
            className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary resize-none" />
          <button onClick={handleAdd} disabled={saving || !title.trim()}
            className="bg-primary hover:bg-primary-light text-bg font-bold text-sm px-6 py-2 rounded-lg disabled:opacity-50">
            {saving ? "追加中..." : "追加"}
          </button>
        </div>
      </Card>

      {weeks.map((w) => {
        const weekVideos = videos.filter((v) => v.week === w);
        return (
          <div key={w} className="mb-4 sm:mb-6">
            <h2 className="font-bold mb-3">Week {w} ({weekVideos.length}本)</h2>
            {weekVideos.length > 0 ? (
              <div className="space-y-2">
                {weekVideos.map((v) => (
                  <Card key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm">{v.title}</h3>
                      <p className="text-text-muted text-xs">{v.cloudflare_video_id || "動画ID未設定"}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleUnlock(v.id, v.unlocked_at)}
                        className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                          v.unlocked_at ? "border-green-500 text-green-400 hover:bg-green-500/10" : "border-border text-text-muted hover:border-primary hover:text-primary"
                        }`}>
                        {v.unlocked_at ? "🔓 公開中" : "🔒 非公開"}
                      </button>
                      <button onClick={() => handleDelete(v.id)} className="text-xs text-red-400 hover:underline">削除</button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-sm">動画なし</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
