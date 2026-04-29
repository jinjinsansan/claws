"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

interface TicketReply {
  id: string;
  body: string;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  body: string;
  status: string;
  file_url: string | null;
  created_at: string;
  user_email: string;
  user_name: string;
  replies: TicketReply[];
}

const STATUSES = [
  { value: "", label: "すべて" },
  { value: "open", label: "未対応" },
  { value: "in_progress", label: "対応中" },
  { value: "closed", label: "完了" },
];

const STATUS_COLORS: Record<string, string> = {
  open: "text-yellow-400", in_progress: "text-blue-400", closed: "text-green-400",
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from("tickets")
      .select("id, subject, body, status, file_url, created_at, user_id, users!tickets_user_id_fkey(email, name), ticket_replies(id, body, created_at)")
      .order("created_at", { ascending: false });

    if (filter) query = query.eq("status", filter);
    const { data } = await query;

    setTickets(
      (data ?? []).map((t: Record<string, unknown>) => {
        const users = t.users as { email: string; name: string } | null;
        const replies = ((t.ticket_replies ?? []) as TicketReply[]).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return {
          id: t.id as string,
          subject: t.subject as string,
          body: t.body as string,
          status: t.status as string,
          file_url: t.file_url as string | null,
          created_at: t.created_at as string,
          user_email: users?.email ?? "",
          user_name: users?.name ?? "匿名",
          replies,
        };
      })
    );
  }, [filter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleStatusChange = async (id: string, status: string) => {
    const supabase = createClient();
    await supabase.from("tickets").update({ status }).eq("id", id);
    fetchTickets();
  };

  const handleReply = async (ticketId: string) => {
    const text = replyText[ticketId]?.trim();
    if (!text) return;
    const supabase = createClient();
    await supabase.from("ticket_replies").insert({ ticket_id: ticketId, body: text });
    await supabase.from("tickets").update({ status: "in_progress" }).eq("id", ticketId);
    setReplyText((prev) => ({ ...prev, [ticketId]: "" }));
    fetchTickets();
  };

  return (
    <div>
      <h1 className="font-serif text-xl sm:text-2xl font-bold mb-2">サポートチケット管理</h1>
      <p className="text-text-muted text-sm mb-4 sm:mb-6">計 {tickets.length} 件</p>

      <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
        {STATUSES.map((s) => (
          <button key={s.value} onClick={() => setFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              filter === s.value ? "bg-primary text-bg font-bold" : "bg-surface border border-border text-text-muted hover:text-text-main"
            }`}>{s.label}</button>
        ))}
      </div>

      <div className="space-y-3">
        {tickets.map((t) => (
          <Card key={t.id}>
            <button onClick={() => setExpandedId(expandedId === t.id ? null : t.id)} className="w-full text-left">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                <span className={`text-xs font-bold ${STATUS_COLORS[t.status] ?? ""}`}>
                  {STATUSES.find((s) => s.value === t.status)?.label ?? t.status}
                </span>
                <span className="text-text-muted text-xs truncate max-w-[200px] sm:max-w-none">{t.user_name} ({t.user_email})</span>
                <span className="text-text-muted text-xs">{new Date(t.created_at).toLocaleDateString("ja-JP")}</span>
                {t.file_url && <span className="text-xs">📎</span>}
                <span className="ml-auto text-text-muted text-xs">{expandedId === t.id ? "▲" : "▼"}</span>
              </div>
              <h3 className="font-bold text-sm">{t.subject}</h3>
            </button>

            {expandedId === t.id && (
              <div className="mt-3 pt-3 border-t border-border space-y-3 sm:space-y-4">
                <p className="text-text-muted text-sm whitespace-pre-wrap">{t.body}</p>
                {t.file_url && (
                  <a href={`/api/download?path=${encodeURIComponent(t.file_url)}`} className="text-primary hover:underline text-sm">📎 添付ファイル</a>
                )}
                {t.replies.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-primary">返信履歴 ({t.replies.length}件)</h4>
                    {t.replies.map((r) => (
                      <div key={r.id} className="pl-4 border-l-2 border-primary/30">
                        <p className="text-text-muted text-xs mb-1">
                          {new Date(r.created_at).toLocaleDateString("ja-JP")}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-muted text-sm">まだ返信がありません</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {["open", "in_progress", "closed"].map((s) => (
                    <button key={s} onClick={() => handleStatusChange(t.id, s)}
                      className={`text-xs px-3 py-1 rounded border transition-colors ${
                        t.status === s ? "border-primary text-primary" : "border-border text-text-muted hover:border-primary"
                      }`}>
                      {STATUSES.find((st) => st.value === s)?.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input type="text" value={replyText[t.id] ?? ""} onChange={(e) => setReplyText((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    placeholder="返信を入力..."
                    className="w-full sm:flex-1 bg-bg border border-border rounded-lg px-4 py-2 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary" />
                  <button onClick={() => handleReply(t.id)} disabled={!replyText[t.id]?.trim()}
                    className="bg-primary hover:bg-primary-light text-bg font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-50">返信</button>
                </div>
              </div>
            )}
          </Card>
        ))}
        {tickets.length === 0 && <p className="text-text-muted text-sm">チケットなし</p>}
      </div>
    </div>
  );
}
