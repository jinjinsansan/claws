"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NewNotificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    notification_type: "announcement",
    target_type: "all",
    scheduled_for: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("push_notifications").insert({
        sender_admin_id: user?.id ?? null,
        title: form.title,
        message: form.message,
        notification_type: form.notification_type,
        target_type: form.target_type,
        target_filter: {},
        scheduled_for: form.scheduled_for || new Date().toISOString(),
        status: "scheduled",
      });

      if (error) {
        console.error("Failed to create notification:", error);
        return;
      }

      router.push("/admin/announcements");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link href="/admin/announcements" className="text-text-dim hover:text-gold text-sm mb-6 inline-block">
        ← 通知一覧へ
      </Link>

      <h1 className="font-cinzel text-2xl font-black text-gold-bright mb-8">新規通知</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div>
          <label className="block text-text-dim text-sm mb-2">通知タイプ</label>
          <select
            value={form.notification_type}
            onChange={(e) => setForm({ ...form, notification_type: e.target.value })}
            className="w-full bg-bg-mid border border-border-faint rounded-lg px-4 py-3 text-text-main focus:border-gold focus:outline-none"
          >
            <option value="announcement">お知らせ</option>
            <option value="promotion">キャンペーン</option>
            <option value="system">システム</option>
            <option value="personal">個人</option>
          </select>
        </div>

        <div>
          <label className="block text-text-dim text-sm mb-2">タイトル</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-bg-mid border border-border-faint rounded-lg px-4 py-3 text-text-main focus:border-gold focus:outline-none"
            placeholder="通知タイトル"
            required
          />
        </div>

        <div>
          <label className="block text-text-dim text-sm mb-2">本文</label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={6}
            className="w-full bg-bg-mid border border-border-faint rounded-lg px-4 py-3 text-text-main focus:border-gold focus:outline-none resize-y"
            placeholder="通知本文"
            required
          />
        </div>

        <div>
          <label className="block text-text-dim text-sm mb-2">配信先</label>
          <select
            value={form.target_type}
            onChange={(e) => setForm({ ...form, target_type: e.target.value })}
            className="w-full bg-bg-mid border border-border-faint rounded-lg px-4 py-3 text-text-main focus:border-gold focus:outline-none"
          >
            <option value="all">全員</option>
            <option value="by_claw">特定Claw所有者</option>
            <option value="by_tier">特定ティア</option>
          </select>
        </div>

        <div>
          <label className="block text-text-dim text-sm mb-2">配信日時（空欄 = 即時）</label>
          <input
            type="datetime-local"
            value={form.scheduled_for}
            onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })}
            className="w-full bg-bg-mid border border-border-faint rounded-lg px-4 py-3 text-text-main focus:border-gold focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-red-blood hover:bg-red-bright text-text-main font-bold rounded transition-colors border border-gold/40 disabled:opacity-50"
        >
          {loading ? "配信中..." : "配信する"}
        </button>
      </form>
    </div>
  );
}
