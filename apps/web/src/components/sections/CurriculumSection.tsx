export default function CurriculumSection() {
  const weeks = [
    {
      week: 1,
      title: "はじめてのClaude Code — 入れて、話しかけて、感動する",
    },
    {
      week: 2,
      title: "日本語だけでWebページを作る",
    },
    {
      week: 3,
      title: "デザインをAIに注文する — プロの見た目に仕上げる",
    },
    {
      week: 4,
      title: "機能を言葉で追加する — ログイン・データ保存",
    },
    {
      week: 5,
      title: "AIの力をアプリに入れる — チャット・要約・分析",
    },
    {
      week: 6,
      title: "完成させて世界に公開する — URLが生まれる瞬間",
    },
    {
      week: 7,
      title: "お金を受け取れるようにする — 決済機能の導入",
    },
    {
      week: 8,
      title: "お客さんを集めて稼ぐ — SNS告知・最初の売上",
    },
  ];

  return (
    <section id="curriculum" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-surface/50">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
          <span className="text-primary">8週間</span>で、あなたは変わる
        </h2>
        <p className="text-text-muted text-sm sm:text-base text-center mb-10 sm:mb-16">
          コードは1行も書きません。Claude Codeに日本語で話しかけるだけ。
        </p>

        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border md:left-1/2" />

          {weeks.map((item, i) => (
            <div key={i} className="relative pl-14 sm:pl-16 md:pl-0 mb-5 sm:mb-8 last:mb-0">
              <div
                className={`md:flex items-center ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                <div className={`md:w-1/2 ${i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                  <div className="bg-surface border border-border rounded-lg p-3 sm:p-5 hover:border-primary/50 transition-colors">
                    <span className="text-primary font-bold text-sm">
                      Week {item.week}
                    </span>
                    <h3 className="font-bold mt-1 text-sm sm:text-base">{item.title}</h3>
                  </div>
                </div>
                <div className="absolute left-4 md:left-1/2 md:-translate-x-1/2 w-4 h-4 bg-primary rounded-full border-2 border-bg top-5" />
                <div className="hidden md:block md:w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
