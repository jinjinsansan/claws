import Card from "@/components/ui/Card";
import { BarChart3, Gamepad2, Heart, Globe, Smartphone, ShoppingCart } from "lucide-react";

const achievements = [
  {
    icon: BarChart3,
    title: "AIデータ分析プラットフォーム",
    description: "リアルタイムデータを収集・分析し、AIが予測を出すWebサービス",
    tag: "データ分析",
    tech: "Next.js / Python / Claude API",
  },
  {
    icon: Gamepad2,
    title: "AIガチャゲーム",
    description: "AI画像生成を活用したオンラインエンターテインメントアプリ",
    tag: "ゲーム",
    tech: "Next.js / Supabase / LINE LIFF",
  },
  {
    icon: Heart,
    title: "AIカウンセラー",
    description: "AI対話型カウンセリング＆感情日記プラットフォーム",
    tag: "ヘルスケア",
    tech: "Next.js / Supabase / OpenAI",
  },
  {
    icon: Globe,
    title: "AIコンテンツ自動生成",
    description: "ブログ記事・SNS投稿をAIで自動生成し自動投稿するシステム",
    tag: "自動化",
    tech: "Python / Claude API / Playwright",
  },
  {
    icon: Smartphone,
    title: "スワイプ型LP作成SaaS",
    description: "スワイプ操作で閲覧できるランディングページ作成・公開SaaS",
    tag: "SaaS",
    tech: "Next.js / FastAPI / Supabase",
  },
  {
    icon: ShoppingCart,
    title: "EC買取プラットフォーム",
    description: "カード買取特化のECサイト。査定・出品・決済を一気通貫",
    tag: "EC",
    tech: "Next.js / Supabase / Stripe",
  },
];

export default function AchievementSection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-surface/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
          私が<span className="text-primary">ノーコード</span>で作ったもの
        </h2>
        <p className="text-text-muted text-sm sm:text-base text-center mb-10 sm:mb-16">
          全てAIへの指示だけで開発。プログラミング知識ゼロから、<br className="hidden sm:block" />
          10以上のプロダクトをリリースしました。
        </p>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
          {achievements.map((item, i) => (
            <Card key={i} className="hover:border-primary/50 transition-colors group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="inline-block bg-primary/20 text-primary text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {item.tag}
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base mb-2">{item.title}</h3>
              <p className="text-text-muted text-xs sm:text-sm mb-3 leading-relaxed">{item.description}</p>
              <p className="text-text-muted text-[10px] sm:text-xs font-mono opacity-60">{item.tech}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
