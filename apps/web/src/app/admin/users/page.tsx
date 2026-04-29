"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

interface User {
  id: string;
  email: string;
  name: string | null;
  plan: string | null;
  created_at: string;
}

const PLAN_OPTIONS = [
  { value: "", label: "未設定" },
  { value: "video-only", label: "動画のみ" },
  { value: "video-email", label: "動画+メール" },
  { value: "zoom", label: "Zoom型" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
    setUsers(data ?? []);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handlePlanChange = async (email: string, plan: string) => {
    const supabase = createClient();
    await supabase.from("users").update({ plan: plan || null }).eq("email", email);
    fetchUsers();
  };

  const filtered = search.trim()
    ? users.filter((u) =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.name ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div>
      <h1 className="font-serif text-xl sm:text-2xl font-bold mb-2">会員管理</h1>
      <p className="text-text-muted text-sm mb-4 sm:mb-6">計 {users.length} 名</p>

      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="名前またはメールで検索"
        className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary mb-4 sm:mb-6" />

      <div className="space-y-2">
        {filtered.map((u) => (
          <Card key={u.id || u.email} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="font-bold text-sm">{u.name || "名前未設定"}</p>
              <p className="text-text-muted text-xs">{u.email}</p>
              <p className="text-text-muted text-xs">{new Date(u.created_at).toLocaleDateString("ja-JP")} 登録</p>
            </div>
            <select
              value={u.plan ?? ""}
              onChange={(e) => handlePlanChange(u.email, e.target.value)}
              className="bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-main focus:outline-none focus:border-primary shrink-0"
            >
              {PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Card>
        ))}
      </div>
    </div>
  );
}
