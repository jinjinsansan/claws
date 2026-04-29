"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { useMember } from "@/components/members/MemberContext";

export default function JobForm({ onPosted }: { onPosted: () => void }) {
  const member = useMember();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"request" | "offer">("request");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("");
  const [contact, setContact] = useState("");
  const [posting, setPosting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !contact.trim()) return;
    setPosting(true);

    const supabase = createClient();
    await supabase.from("jobs").insert({
      user_id: member.userId,
      type,
      title: title.trim(),
      description: description.trim(),
      budget: budget.trim() || null,
      duration: duration.trim() || null,
      contact: contact.trim(),
    });

    setTitle("");
    setDescription("");
    setBudget("");
    setDuration("");
    setContact("");
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
        新しい依頼・案件を投稿する...
      </button>
    );
  }

  return (
    <Card className="mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          {(["request", "offer"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${
                type === t
                  ? "bg-primary/20 text-primary font-bold"
                  : "bg-bg text-text-muted"
              }`}
            >
              {t === "request" ? "依頼したい" : "受けたい"}
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="概要・詳細"
          required
          rows={4}
          className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors resize-none"
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <input
            type="text"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="予算（例: ¥50,000）"
            className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
          />
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="期間（例: 2週間）"
            className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="連絡方法（例: X DM @username）"
          required
          className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
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
            disabled={posting || !title.trim() || !description.trim() || !contact.trim()}
            className="bg-primary hover:bg-primary-light text-bg font-bold text-sm px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {posting ? "投稿中..." : "投稿する"}
          </button>
        </div>
      </form>
    </Card>
  );
}
