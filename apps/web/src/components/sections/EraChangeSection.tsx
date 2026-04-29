export default function EraChangeSection() {
  const comparisons = [
    {
      before: "プログラミング言語を何年も学習",
      after: "AIに日本語で指示するだけ",
    },
    {
      before: "チーム開発・外注で数百万円",
      after: "個人で、ほぼゼロコストで開発",
    },
    {
      before: "アイデアから完成まで数ヶ月〜数年",
      after: "数日〜数週間でプロダクト完成",
    },
  ];

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4 sm:mb-6">
          AIは、<br className="sm:hidden" /><span className="text-primary">個人開発の常識</span>を変えた
        </h2>
        <p className="text-text-muted text-sm sm:text-base text-center max-w-2xl mx-auto mb-10 sm:mb-16 leading-relaxed">
          コードを書かなくてもプロ品質のアプリが作れる時代。まだほとんどの人がその事実を知らない。気づいた人から、圧倒的な差がつき始めている。
        </p>

        <div className="space-y-6">
          {comparisons.map((item, i) => (
            <div
              key={i}
              className="grid md:grid-cols-[1fr_auto_1fr] gap-3 sm:gap-4 items-center"
            >
              <div className="bg-surface border border-border rounded-lg p-4 sm:p-6 text-center">
                <div className="text-text-muted text-xs mb-2 uppercase tracking-wider">
                  10年前
                </div>
                <p className="text-text-muted text-sm sm:text-base line-through">{item.before}</p>
              </div>
              <div className="text-primary text-xl sm:text-2xl font-bold text-center md:block">
                <span className="hidden md:inline">→</span>
                <span className="md:hidden">↓</span>
              </div>
              <div className="bg-surface border border-primary/30 rounded-lg p-4 sm:p-6 text-center">
                <div className="text-primary text-xs mb-2 uppercase tracking-wider">
                  今
                </div>
                <p className="text-text-main text-sm sm:text-base font-bold">{item.after}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
