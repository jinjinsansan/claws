"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { useMember } from "@/components/members/MemberContext";

const CATEGORIES = [
  { value: "self-intro", label: "自己紹介" },
  { value: "question", label: "質問" },
  { value: "showcase", label: "作ったもの報告" },
  { value: "general", label: "雑談" },
];

export default function PostForm({ onPosted }: { onPosted: () => void }) {
  const member = useMember();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setPosting(true);

    const supabase = createClient();
    await supabase.from("posts").insert({
      user_id: member.userId,
      category,
      title: title.trim(),
      body: body.trim(),
    });

    setTitle("");
    setBody("");
    setOpen(false);
    setPosting(false);
    onPosted();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-surface border border-border hover:border-primary/50 rounded-xl px-6 py-4 text-left text-text-muted transition-colors mb-6"
      >
        新しいスレッドを投稿する...
      </button>
    );
  }

  return (
    <Card className="mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                category === cat.value
                  ? "bg-primary/20 text-primary font-bold"
                  : "bg-bg text-text-muted"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          required
          className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="本文（任意）"
          rows={4}
          className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors resize-none"
        />
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-text-muted hover:text-text-main text-sm px-4 py-2 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={posting || !title.trim()}
            className="bg-primary hover:bg-primary-light text-bg font-bold text-sm px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {posting ? "投稿中..." : "投稿する"}
          </button>
        </div>
      </form>
    </Card>
  );
}
