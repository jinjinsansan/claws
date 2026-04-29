export interface Episode {
  number: number;
  title: string;
  description: string;
  purpose: string;
  fullDescription: string;
}

export const episodes: Episode[] = [
  {
    number: 1,
    title: "AIが変えた、個人開発の常識",
    description: "時代の変化・AIで何でも作れる現実",
    purpose: "共感・興味喚起",
    fullDescription:
      "AIの進化により、個人でもプロ品質のプロダクトが作れる時代が来ました。この動画では、時代がどう変わったのか、そしてなぜ今がチャンスなのかをお伝えします。",
  },
  {
    number: 2,
    title: "私のAIプロダクトはこうして生まれた",
    description: "開発実録・使ったツール・失敗談",
    purpose: "信頼構築・実績提示",
    fullDescription:
      "AIプロダクトの開発実録をお見せします。どんなツールを使い、どんな失敗を経て、どうやって完成させたのか。リアルなストーリーをお届けします。",
  },
  {
    number: 3,
    title: "あなたにも同じことができる理由",
    description: "受講者目線・学習ロードマップ・卒業後のビジョン",
    purpose: "欲求喚起・不安解消",
    fullDescription:
      "「自分にもできるのか？」という不安に答えます。受講者目線で学習ロードマップを解説し、卒業後にどんな未来が待っているのかをお伝えします。",
  },
  {
    number: 4,
    title: "AI Builders Lab、始まります",
    description: "サロン全貌・料金・申し込み方法",
    purpose: "クロージング・CTA",
    fullDescription:
      "AI Builders Labの全貌を公開。カリキュラム詳細、料金プラン、申し込み方法を詳しくご説明します。",
  },
];
