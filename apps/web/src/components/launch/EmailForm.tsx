"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EmailForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("launch_emails")
        .upsert({ email }, { onConflict: "email" });

      if (error) throw error;

      setStatus("success");
      setMessage("登録ありがとうございます！");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("登録に失敗しました。もう一度お試しください。");
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6 mt-8">
      <h3 className="font-bold text-sm mb-2">最新情報を受け取る</h3>
      <p className="text-text-muted text-sm mb-4">
        メールアドレスを登録すると、新着動画や特別なお知らせをお届けします。
      </p>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 bg-bg border border-border rounded-lg px-4 py-2 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-primary hover:bg-primary-light text-bg font-bold px-6 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {status === "loading" ? "送信中..." : "登録"}
        </button>
      </form>
      {message && (
        <p
          className={`text-sm mt-3 ${
            status === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
