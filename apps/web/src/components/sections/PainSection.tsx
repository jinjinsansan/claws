import { AlertTriangle, Clock, DollarSign, HelpCircle } from "lucide-react";

const pains = [
  {
    icon: HelpCircle,
    text: "AIで稼げるらしいけど、何から始めればいいか分からない",
  },
  {
    icon: Clock,
    text: "プログラミングを学ぶ時間も気力もない",
  },
  {
    icon: DollarSign,
    text: "外注すると高すぎて、個人では手が出せない",
  },
  {
    icon: AlertTriangle,
    text: "YouTubeやnoteの情報がバラバラで、体系的に学べない",
  },
];

export default function PainSection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-surface/50">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
          こんな<span className="text-primary">悩み</span>、ありませんか？
        </h2>
        <p className="text-text-muted text-sm sm:text-base text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          もし1つでも当てはまるなら、AI Builders Lab はあなたのための場所です。
        </p>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          {pains.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-4 bg-bg border border-border rounded-xl p-5 sm:p-6 hover:border-primary/40 transition-colors"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-red-400" strokeWidth={1.5} />
              </div>
              <p className="text-text-main text-sm sm:text-base leading-relaxed">
                {item.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 sm:mt-14 text-center">
          <p className="text-text-muted text-sm sm:text-base mb-2">
            安心してください。
          </p>
          <p className="font-serif text-lg sm:text-xl md:text-2xl font-bold">
            その全てを解決するのが、<br className="sm:hidden" />
            <span className="text-primary">AI Builders Lab</span> です。
          </p>
        </div>
      </div>
    </section>
  );
}
