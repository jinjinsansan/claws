"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Card from "@/components/ui/Card";

const plans = [
  {
    id: "video-only",
    name: "動画のみ",
    price: "¥49,800",
    description: "全講義動画アーカイブ閲覧",
  },
  {
    id: "video-email",
    name: "動画 + メールサポート",
    price: "¥98,000",
    description: "動画閲覧 + 個別メール相談",
    recommended: true,
  },
  {
    id: "zoom",
    name: "Zoom型（1期生）",
    price: "¥150,000",
    description: "8週間×週1回2時間Zoom（録画あり）",
  },
];

export default function ApplyPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "エラーが発生しました");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-main">
      <Header />
      <main className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="text-primary">プラン</span>を選択
          </h1>
          <p className="text-text-muted text-sm sm:text-base text-center mb-8 sm:mb-12">
            お好みのプランを選んでお申し込みください
          </p>

          <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                highlight={selectedPlan === plan.id}
                className={`cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? "ring-2 ring-primary"
                    : "hover:border-primary/30"
                }`}
              >
                <label className="flex items-start sm:items-center gap-3 sm:gap-4 cursor-pointer">
                  <input
                    type="radio"
                    name="plan"
                    value={plan.id}
                    checked={selectedPlan === plan.id}
                    onChange={() => setSelectedPlan(plan.id)}
                    className="w-5 h-5 accent-[#c9a84c] mt-1 sm:mt-0 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <h3 className="font-bold text-base sm:text-lg">{plan.name}</h3>
                      {plan.recommended && (
                        <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                          おすすめ
                        </span>
                      )}
                    </div>
                    <p className="text-text-muted text-sm mt-1">
                      {plan.description}
                    </p>
                  </div>
                  <div className="font-serif text-lg sm:text-xl font-bold text-primary shrink-0">
                    {plan.price}
                  </div>
                </label>
              </Card>
            ))}
          </div>

          {error && (
            <div className="text-red-400 text-center mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="text-center">
            <button
              onClick={handleCheckout}
              disabled={!selectedPlan || loading}
              className={`inline-block py-3 sm:py-4 px-10 sm:px-16 rounded-lg text-base sm:text-lg font-bold transition-colors bg-primary hover:bg-primary-light text-bg ${
                !selectedPlan || loading
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {loading ? "処理中..." : "決済に進む"}
            </button>
            <p className="text-text-muted text-sm mt-4">
              Stripeの安全な決済画面に移動します
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
