import { BookOpen, Wrench, TrendingUp } from "lucide-react";

const pillars = [
  {
    icon: BookOpen,
    title: "学ぶ",
    description:
      "8週間の実践カリキュラムで、AIを使った個人開発の全工程をマスター",
  },
  {
    icon: Wrench,
    title: "作る",
    description:
      "学んだ知識を即実践。自分だけのAIプロダクトを実際に作り上げる",
  },
  {
    icon: TrendingUp,
    title: "稼ぐ",
    description:
      "マネタイズの方法まで完全網羅。作ったプロダクトで収益化を実現",
  },
];

export default function AboutSection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
          AI Builders Labは、<br className="md:hidden" /><span className="text-primary">作れる人間を増やす場所</span>です
        </h2>
        <p className="text-text-muted text-sm sm:text-base text-center max-w-2xl mx-auto mb-10 sm:mb-16 leading-relaxed">
          AIプロダクトの作り方を教える。本質は「何でも作れる力」を身につけること。<br className="sm:hidden" />学ぶだけでなく、仲間と作り、依頼し合えるコミュニティ。
        </p>

        <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 md:gap-8">
          {pillars.map((item, i) => (
            <div key={i} className="text-center">
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <item.icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="font-serif text-xl font-bold text-primary mb-3">
                {item.title}
              </h3>
              <p className="text-text-muted text-sm sm:text-base leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
