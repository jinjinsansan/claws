import Accordion from "@/components/ui/Accordion";

const faqItems = [
  {
    question: "プログラミング経験がなくても大丈夫ですか？",
    answer:
      "はい、全く問題ありません。本カリキュラムはノーコード・AIを活用した開発手法を教えるため、プログラミングの事前知識は不要です。AIへの指示の出し方から丁寧に解説します。",
  },
  {
    question: "特定の業界知識がなくても受講できますか？",
    answer:
      "もちろんです。カリキュラムでは様々なジャンルのAIプロダクトを題材にしており、本質は「AIを使って何でも作れる力」を身につけることです。学んだスキルはあらゆるプロダクト開発に応用できます。",
  },
  {
    question: "動画はいつまで視聴できますか？",
    answer:
      "購入いただいた動画は無期限で視聴可能です。何度でも繰り返し学習にお使いいただけます。",
  },
  {
    question: "Zoom型は録画を後から見られますか？",
    answer:
      "はい、全てのZoom講座は録画されます。リアルタイムで参加できなかった場合も、後から録画で学習できます。",
  },
  {
    question: "返金保証はありますか？",
    answer:
      "申し込み後7日以内であれば、全額返金いたします。詳しくは特定商取引法に基づく表記をご確認ください。",
  },
];

export default function FAQSection() {
  return (
    <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-surface/50">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
          よくある<span className="text-primary">質問</span>
        </h2>
        <p className="text-text-muted text-sm sm:text-base text-center mb-8 sm:mb-12">
          お申し込み前に気になる点をご確認ください
        </p>
        <Accordion items={faqItems} />
      </div>
    </section>
  );
}
