"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Reply {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  user_name: string;
}

export default function ReplySection({
  postId,
  currentUserId,
}: {
  postId: string;
  currentUserId: string;
}) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchReplies = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("replies")
      .select("id, user_id, body, created_at, users!replies_user_id_fkey(name)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    const mapped: Reply[] = (data ?? []).map((r: Record<string, unknown>) => {
      const users = r.users as { name: string } | null;
      return {
        id: r.id as string,
        user_id: r.user_id as string,
        body: r.body as string,
        created_at: r.created_at as string,
        user_name: users?.name ?? "匿名",
      };
    });
    setReplies(mapped);
  }, [postId]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);

    const supabase = createClient();
    await supabase.from("replies").insert({
      post_id: postId,
      user_id: currentUserId,
      body: body.trim(),
    });

    setBody("");
    setPosting(false);
    fetchReplies();
  };

  return (
    <div className="mt-4 pt-4 border-t border-border">
      {replies.length > 0 && (
        <div className="space-y-3 mb-4">
          {replies.map((r) => (
            <div key={r.id} className="pl-4 border-l-2 border-border">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-text-muted text-xs font-bold">
                  {r.user_name}
                </span>
                <span className="text-text-muted text-xs">
                  {new Date(r.created_at).toLocaleDateString("ja-JP")}
                </span>
              </div>
              <p className="text-sm text-text-muted whitespace-pre-wrap">
                {r.body}
              </p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="返信を入力..."
          className="w-full sm:flex-1 bg-bg border border-border rounded-lg px-4 py-2 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
        />
        <button
          type="submit"
          disabled={posting || !body.trim()}
          className="w-full sm:w-auto bg-primary hover:bg-primary-light text-bg font-bold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          返信
        </button>
      </form>
    </div>
  );
}
