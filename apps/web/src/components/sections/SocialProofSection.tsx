import Card from "@/components/ui/Card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "T.K.",
    age: "30代",
    job: "会社員",
    text: "プログラミング経験ゼロでしたが、3週目には自分のWebアプリが動いていて感動しました。AIへの指示の出し方を学ぶだけで、こんなに変わるとは。",
    result: "受講2ヶ月でSaaSをリリース",
  },
  {
    name: "M.S.",
    age: "40代",
    job: "フリーランス",
    text: "今まで外注に50万円かけていた開発が、自分で3日で作れるようになりました。Claude Codeの使い方を体系的に学べたのが大きかった。",
    result: "外注費を年間200万円削減",
  },
  {
    name: "A.Y.",
    age: "20代",
    job: "副業ワーカー",
    text: "YouTubeで断片的に学んでいたけど全然進まなかった。カリキュラム通りに進めたら、たった8週間で3つのプロダクトが完成しました。",
    result: "副業で月5万円の収益を達成",
  },
];

export default function SocialProofSection() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
          受講者の<span className="text-primary">リアルな声</span>
        </h2>
        <p className="text-text-muted text-sm sm:text-base text-center mb-10 sm:mb-14">
          実際に AI Builders Lab で学んだ方々の体験談です
        </p>

        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((item, i) => (
            <Card key={i} className="flex flex-col">
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    className="w-4 h-4 text-primary fill-primary"
                  />
                ))}
              </div>
              <p className="text-text-muted text-sm leading-relaxed flex-1 mb-4">
                &ldquo;{item.text}&rdquo;
              </p>
              <div className="border-t border-border pt-4 mt-auto">
                <div className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-lg inline-block mb-3">
                  {item.result}
                </div>
                <p className="text-text-main text-sm font-bold">
                  {item.name}
                  <span className="text-text-muted font-normal ml-2">
                    {item.age} / {item.job}
                  </span>
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
