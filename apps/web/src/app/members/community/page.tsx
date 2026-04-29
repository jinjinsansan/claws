"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { useMember } from "@/components/members/MemberContext";
import PostForm from "@/components/community/PostForm";
import PostItem from "@/components/community/PostItem";

const CATEGORIES = [
  { value: "", label: "すべて" },
  { value: "self-intro", label: "自己紹介" },
  { value: "question", label: "質問" },
  { value: "showcase", label: "作ったもの報告" },
  { value: "general", label: "雑談" },
];

const PAGE_SIZE = 20;

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

export default function CommunityPage() {
  const member = useMember();
  const [posts, setPosts] = useState<Post[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPosts = useCallback(async (pageNum = 0) => {
    setLoading(true);
    const supabase = createClient();
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    if (pageNum === 0) {
      let countQuery = supabase.from("posts").select("*", { count: "exact", head: true });
      if (category) countQuery = countQuery.eq("category", category);
      const { count } = await countQuery;
      setTotalCount(count ?? 0);
    }

    let query = supabase
      .from("posts")
      .select(`
        id, user_id, category, title, body, pinned, created_at,
        users!posts_user_id_fkey(name),
        post_likes(user_id),
        replies(id)
      `)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (category) {
      query = query.eq("category", category);
    }

    const { data } = await query;

    const mapped: Post[] = (data ?? []).map((p: Record<string, unknown>) => {
      const users = p.users as { name: string } | null;
      const likes = (p.post_likes ?? []) as { user_id: string }[];
      const replies = (p.replies ?? []) as { id: string }[];
      return {
        id: p.id as string,
        user_id: p.user_id as string,
        category: p.category as string,
        title: p.title as string,
        body: p.body as string,
        pinned: p.pinned as boolean,
        created_at: p.created_at as string,
        user_name: users?.name ?? "匿名",
        like_count: likes.length,
        reply_count: replies.length,
        liked_by_me: likes.some((l) => l.user_id === member.userId),
      };
    });

    setHasMore(mapped.length === PAGE_SIZE);

    if (pageNum === 0) {
      setPosts(mapped);
    } else {
      setPosts((prev) => [...prev, ...mapped]);
    }
    setPage(pageNum);
    setLoading(false);
  }, [category, member.userId]);

  useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  const handleRefresh = () => fetchPosts(0);

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mb-2">
        <h1 className="font-serif text-xl sm:text-2xl font-bold">コミュニティ</h1>
        {totalCount > 0 && (
          <span className="text-text-muted text-sm">全{totalCount}件</span>
        )}
      </div>
      <p className="text-text-muted text-sm mb-4 sm:mb-6">
        仲間と交流し、学びを深めましょう
      </p>

      <PostForm onPosted={handleRefresh} />

      <div className="flex gap-2 mb-4 sm:mb-6 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              category === cat.value
                ? "bg-primary text-bg font-bold"
                : "bg-surface border border-border text-text-muted hover:text-text-main"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              currentUserId={member.userId}
              isAdmin={member.isAdmin}
              onUpdated={handleRefresh}
            />
          ))}
          {hasMore && (
            <button
              onClick={() => fetchPosts(page + 1)}
              disabled={loading}
              className="w-full py-3 text-center text-text-muted hover:text-primary text-sm border border-border rounded-lg transition-colors"
            >
              {loading ? "読み込み中..." : "もっと見る"}
            </button>
          )}
        </div>
      ) : loading ? (
        <p className="text-text-muted text-center py-8">読み込み中...</p>
      ) : (
        <Card className="text-center py-8">
          <p className="text-text-muted">まだ投稿がありません</p>
        </Card>
      )}
    </div>
  );
}
