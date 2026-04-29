"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { useMember } from "@/components/members/MemberContext";
import JobForm from "@/components/jobs/JobForm";
import { ADMIN_EMAIL } from "@/lib/admin";

interface Job {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  budget: string | null;
  duration: string | null;
  contact: string;
  created_at: string;
  user_name: string;
  interested_count: number;
  interested_by_me: boolean;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  request: { label: "依頼したい", color: "bg-blue-500/20 text-blue-400" },
  offer: { label: "受けたい", color: "bg-green-500/20 text-green-400" },
};

const PAGE_SIZE = 20;

function parseBudget(b: string | null): number {
  if (!b) return 0;
  const num = parseInt(b.replace(/[^0-9]/g, ""), 10);
  return isNaN(num) ? 0 : num;
}

export default function JobsPage() {
  const member = useMember();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"new" | "budget">("new");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchJobs = useCallback(async (pageNum = 0) => {
    setLoading(true);
    const supabase = createClient();
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    if (pageNum === 0) {
      let countQuery = supabase.from("jobs").select("*", { count: "exact", head: true });
      if (typeFilter) countQuery = countQuery.eq("type", typeFilter);
      const { count } = await countQuery;
      setTotalCount(count ?? 0);
    }

    let query = supabase
      .from("jobs")
      .select(`
        id, user_id, type, title, description, budget, duration, contact, created_at,
        users!jobs_user_id_fkey(name),
        job_interests(user_id)
      `)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (typeFilter) {
      query = query.eq("type", typeFilter);
    }

    const { data } = await query;

    let mapped: Job[] = (data ?? []).map((j: Record<string, unknown>) => {
      const users = j.users as { name: string } | null;
      const interests = (j.job_interests ?? []) as { user_id: string }[];
      return {
        id: j.id as string,
        user_id: j.user_id as string,
        type: j.type as string,
        title: j.title as string,
        description: j.description as string,
        budget: j.budget as string | null,
        duration: j.duration as string | null,
        contact: j.contact as string,
        created_at: j.created_at as string,
        user_name: users?.name ?? "匿名",
        interested_count: interests.length,
        interested_by_me: interests.some((i) => i.user_id === member.userId),
      };
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      mapped = mapped.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q)
      );
    }

    if (sortBy === "budget") {
      mapped.sort((a, b) => parseBudget(b.budget) - parseBudget(a.budget));
    }

    setHasMore(mapped.length === PAGE_SIZE);
    if (pageNum === 0) {
      setJobs(mapped);
    } else {
      setJobs((prev) => [...prev, ...mapped]);
    }
    setPage(pageNum);
    setLoading(false);
  }, [typeFilter, search, sortBy, member.userId]);

  useEffect(() => {
    fetchJobs(0);
  }, [fetchJobs]);

  const handleRefresh = () => fetchJobs(0);

  const handleInterest = async (jobId: string, alreadyInterested: boolean) => {
    const supabase = createClient();
    if (alreadyInterested) {
      await supabase
        .from("job_interests")
        .delete()
        .eq("job_id", jobId)
        .eq("user_id", member.userId);
    } else {
      await supabase
        .from("job_interests")
        .insert({ job_id: jobId, user_id: member.userId });
    }
    handleRefresh();
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mb-2">
        <h1 className="font-serif text-xl sm:text-2xl font-bold">受発注ボード</h1>
        {totalCount > 0 && (
          <span className="text-text-muted text-sm">全{totalCount}件</span>
        )}
      </div>
      <p className="text-text-muted text-sm mb-4 sm:mb-6">
        仲間同士で依頼・受注し合えるボードです
      </p>

      <JobForm onPosted={handleRefresh} />

      {/* Admin Direct Request */}
      <Card className="mb-6 border-primary/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm">管理者へ直接依頼</h3>
            <p className="text-text-muted text-xs mt-1">
              仁さんに直接お仕事を依頼したい場合はこちら
            </p>
          </div>
          <a
            href={`mailto:${ADMIN_EMAIL}?subject=【直接依頼】`}
            className="shrink-0 bg-primary hover:bg-primary-light text-bg font-bold text-sm px-4 py-2 rounded-lg transition-colors text-center"
          >
            メールで依頼
          </a>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6 items-center">
        <div className="flex gap-2 w-full sm:w-auto">
          {[
            { value: "", label: "すべて" },
            { value: "request", label: "依頼したい" },
            { value: "offer", label: "受けたい" },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                typeFilter === t.value
                  ? "bg-primary text-bg font-bold"
                  : "bg-surface border border-border text-text-muted hover:text-text-main"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="キーワード検索"
          className="w-full sm:w-auto bg-surface border border-border rounded-lg px-4 py-1.5 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "new" | "budget")}
          className="w-full sm:w-auto bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text-muted focus:outline-none focus:border-primary transition-colors"
        >
          <option value="new">新着順</option>
          <option value="budget">予算順</option>
        </select>
      </div>

      {/* Job List */}
      {jobs.length > 0 ? (
        <div className="space-y-4">
          {jobs.map((job) => {
            const typeInfo = TYPE_LABELS[job.type] ?? TYPE_LABELS.request;
            return (
              <Card key={job.id} className="hover:border-primary/30 transition-colors">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                      <span className="text-text-muted text-xs">{job.user_name}</span>
                      <span className="text-text-muted text-xs">
                        {new Date(job.created_at).toLocaleDateString("ja-JP")}
                      </span>
                      {job.interested_count > 0 && (
                        <span className="text-xs text-primary">
                          🙋 {job.interested_count}人が興味あり
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold mb-1">{job.title}</h3>
                    <p className="text-text-muted text-sm whitespace-pre-wrap line-clamp-3">
                      {job.description}
                    </p>
                    <div className="flex gap-4 mt-3 text-xs text-text-muted">
                      {job.budget && <span>予算: {job.budget}</span>}
                      {job.duration && <span>期間: {job.duration}</span>}
                    </div>
                  </div>
                  {job.user_id !== member.userId && (
                    <button
                      onClick={() => handleInterest(job.id, job.interested_by_me)}
                      className={`shrink-0 font-bold text-sm px-4 py-2 rounded-lg transition-colors ${
                        job.interested_by_me
                          ? "bg-primary text-bg"
                          : "bg-primary/20 hover:bg-primary/30 text-primary"
                      }`}
                    >
                      {job.interested_by_me ? "興味あり済" : "興味あり"}
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
          {hasMore && (
            <button
              onClick={() => fetchJobs(page + 1)}
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
