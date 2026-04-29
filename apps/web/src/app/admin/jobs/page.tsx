"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

interface Job {
  id: string;
  type: string;
  title: string;
  description: string;
  budget: string | null;
  duration: string | null;
  contact: string;
  created_at: string;
  user_name: string;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  const fetchJobs = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("jobs")
      .select("id, type, title, description, budget, duration, contact, created_at, users!jobs_user_id_fkey(name)")
      .order("created_at", { ascending: false });

    setJobs(
      (data ?? []).map((j: Record<string, unknown>) => ({
        id: j.id as string,
        type: j.type as string,
        title: j.title as string,
        description: j.description as string,
        budget: j.budget as string | null,
        duration: j.duration as string | null,
        contact: j.contact as string,
        created_at: j.created_at as string,
        user_name: (j.users as { name: string } | null)?.name ?? "匿名",
      }))
    );
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    const supabase = createClient();
    await supabase.from("job_interests").delete().eq("job_id", id);
    await supabase.from("jobs").delete().eq("id", id);
    fetchJobs();
  };

  return (
    <div>
      <h1 className="font-serif text-xl sm:text-2xl font-bold mb-2">受発注ボード管理</h1>
      <p className="text-text-muted text-sm mb-4 sm:mb-6">計 {jobs.length} 件</p>

      <div className="space-y-2">
        {jobs.map((j) => (
          <Card key={j.id} className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  j.type === "request" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"
                }`}>
                  {j.type === "request" ? "依頼" : "受注"}
                </span>
                <span className="text-text-muted text-xs">{j.user_name}</span>
                <span className="text-text-muted text-xs">{new Date(j.created_at).toLocaleDateString("ja-JP")}</span>
              </div>
              <h3 className="font-bold text-sm">{j.title}</h3>
              <p className="text-text-muted text-xs mt-1 line-clamp-2">{j.description}</p>
              <div className="flex gap-3 mt-1 text-xs text-text-muted">
                {j.budget && <span>予算: {j.budget}</span>}
                {j.duration && <span>期間: {j.duration}</span>}
                <span>連絡: {j.contact}</span>
              </div>
            </div>
            <button onClick={() => handleDelete(j.id)} className="text-xs text-red-400 hover:underline shrink-0">削除</button>
          </Card>
        ))}
        {jobs.length === 0 && <p className="text-text-muted text-sm">案件なし</p>}
      </div>
    </div>
  );
}
