"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import ReplySection from "@/components/community/ReplySection";

const CATEGORY_LABELS: Record<string, string> = {
  "self-intro": "自己紹介",
  question: "質問",
  showcase: "作ったもの報告",
  general: "雑談",
};

interface Post {
  id: string;
  user_id: string;
  category: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  user_name: string;
  like_count: number;
  reply_count: number;
  liked_by_me: boolean;
}

export default function PostItem({
  post,
  currentUserId,
  isAdmin,
  onUpdated,
}: {
  post: Post;
  currentUserId: string;
  isAdmin: boolean;
  onUpdated: () => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [liking, setLiking] = useState(false);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const supabase = createClient();

    if (post.liked_by_me) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentUserId);
    } else {
      await supabase
        .from("post_likes")
        .insert({ post_id: post.id, user_id: currentUserId });
    }

    setLiking(false);
    onUpdated();
  };

  const handleAdminAction = async (action: "delete" | "pin" | "unpin") => {
    if (action === "delete" && !confirm("この投稿を削除しますか？")) return;

    await fetch("/api/admin/delete-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id, action }),
    });

    onUpdated();
  };

  return (
    <Card className={post.pinned ? "border-primary/40" : ""}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {post.pinned && (
              <span className="text-primary text-xs font-bold">📌 ピン留め</span>
            )}
            <span className="bg-surface border border-border text-text-muted text-xs px-2 py-0.5 rounded">
              {CATEGORY_LABELS[post.category] ?? post.category}
            </span>
            <span className="text-text-muted text-xs">{post.user_name}</span>
            <span className="text-text-muted text-xs">
              {new Date(post.created_at).toLocaleDateString("ja-JP")}
            </span>
          </div>
          <h3 className="font-bold mb-1">{post.title}</h3>
          {post.body && (
            <p className="text-text-muted text-sm whitespace-pre-wrap leading-relaxed">
              {post.body}
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <button
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center gap-1 text-sm transition-colors ${
                post.liked_by_me
                  ? "text-primary"
                  : "text-text-muted hover:text-primary"
              }`}
            >
              {post.liked_by_me ? "♥" : "♡"} {post.like_count}
            </button>
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 text-sm text-text-muted hover:text-text-main transition-colors"
            >
              💬 {post.reply_count}件の返信
            </button>

            {isAdmin && (
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() =>
                    handleAdminAction(post.pinned ? "unpin" : "pin")
                  }
                  className="text-xs text-text-muted hover:text-primary transition-colors"
                >
                  {post.pinned ? "ピン解除" : "📌 ピン留め"}
                </button>
                <button
                  onClick={() => handleAdminAction("delete")}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  削除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showReplies && (
        <ReplySection postId={post.id} currentUserId={currentUserId} />
      )}
    </Card>
  );
}
