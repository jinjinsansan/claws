import Button from "@/components/ui/Button";

const stats = [
  { number: "10+", label: "リリース済みプロダクト" },
  { number: "0行", label: "書いたコード" },
  { number: "8週間", label: "あなたも作れるまで" },
];

export default function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-[100dvh] px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-primary/10 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6 sm:mb-8">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-primary text-xs sm:text-sm font-bold">1期生募集中 — 残りわずか</span>
        </div>

        <h1 className="font-serif text-[26px] sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 leading-[1.3]">
          10年前には不可能だった。<br />
          <span className="text-primary">今日から、あなたにも<br className="sm:hidden" />できる。</span>
        </h1>
        <p className="text-text-muted text-sm sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
          AIを使って10以上のプロダクトを生み出した開発者が、<br className="hidden sm:block" />
          コードを1行も書かずにプロ品質のアプリを作る方法を、<br className="hidden sm:block" />
          8週間で全て教えます。
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-6 sm:gap-10 mb-8 sm:mb-12">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
                {stat.number}
              </div>
              <div className="text-text-muted text-[10px] sm:text-xs mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Button href="/launch/episode/1" className="text-base sm:text-lg py-3 sm:py-4 px-8 sm:px-12">
            無料ローンチ動画を見る
          </Button>
          <Button href="/#pricing" variant="outline" className="text-base sm:text-lg py-3 sm:py-4 px-8 sm:px-12">
            料金プランを見る
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-text-muted/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2.5 bg-text-muted/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}
