import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function PricingSection() {
  const plans = [
    {
      name: "動画のみ",
      price: "¥49,800",
      description: "全講義動画アーカイブ閲覧",
      features: [
        "全8週分の講義動画",
        "動画は無期限で視聴可能",
        "資料ダウンロード",
      ],
      highlight: false,
    },
    {
      name: "動画 + メールサポート",
      price: "¥98,000",
      description: "動画閲覧 + 個別メール相談",
      features: [
        "全8週分の講義動画",
        "動画は無期限で視聴可能",
        "資料ダウンロード",
        "個別メール相談（無制限）",
        "質問への優先回答",
      ],
      highlight: true,
      badge: "おすすめ",
    },
    {
      name: "Zoom型（1期生）",
      price: "¥150,000",
      description: "8週間×週1回2時間Zoom（録画あり）",
      features: [
        "全8週分の講義動画",
        "週1回のライブZoom講座",
        "資料ダウンロード",
        "個別メール相談（無制限）",
        "Zoomでの直接質問",
        "卒業後6ヶ月コミュニティ無料",
      ],
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
          あなたのペースで選べる<br className="sm:hidden" /><span className="text-primary">3つのプラン</span>
        </h2>
        <p className="text-text-muted text-sm sm:text-base text-center mb-10 sm:mb-16">
          一括払い・追加料金なし
        </p>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {plans.map((plan, i) => (
            <Card
              key={i}
              highlight={plan.highlight}
              className={`relative flex flex-col ${
                plan.highlight ? "md:-mt-4 md:mb-4" : ""
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-bg text-xs font-bold px-4 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
              <p className="text-text-muted text-sm mb-4">{plan.description}</p>
              <div className="mb-4 sm:mb-6">
                <span className="font-serif text-2xl sm:text-3xl font-bold text-primary">
                  {plan.price}
                </span>
                <span className="text-text-muted text-xs sm:text-sm ml-1">（税込）</span>
              </div>
              <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 flex-1">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">✓</span>
                    <span className="text-text-muted">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                href="/apply"
                variant={plan.highlight ? "primary" : "outline"}
                className="w-full text-center"
              >
                申し込む
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
