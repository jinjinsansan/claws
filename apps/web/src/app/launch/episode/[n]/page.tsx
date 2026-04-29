import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import EmailForm from "@/components/launch/EmailForm";
import WatchedTracker from "@/components/launch/WatchedTracker";
import { episodes } from "@/lib/episodes";

export function generateStaticParams() {
  return episodes.map((ep) => ({ n: String(ep.number) }));
}

export default function EpisodePage({ params }: { params: { n: string } }) {
  const episodeNum = parseInt(params.n, 10);
  const episode = episodes.find((ep) => ep.number === episodeNum);

  if (!episode) {
    notFound();
  }

  const prevEp = episodeNum > 1 ? episodeNum - 1 : null;
  const nextEp = episodeNum < 4 ? episodeNum + 1 : null;

  return (
    <div className="min-h-screen bg-bg text-text-main">
      <Header />
      <WatchedTracker episodeNumber={episodeNum} />
      <main className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <span className="text-primary font-bold text-sm">
            第{episode.number}話 ― {episode.purpose}
          </span>
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold mt-2 mb-5 sm:mb-8">
            {episode.title}
          </h1>

          {/* Cloudflare Stream Player */}
          <div className="w-full aspect-video bg-surface border border-border rounded-xl mb-5 sm:mb-8 flex items-center justify-center">
            <div className="text-center">
              <p className="text-text-muted mb-2">動画プレイヤー</p>
              <p className="text-text-muted text-sm">
                Cloudflare Stream 埋め込み予定
              </p>
            </div>
          </div>

          <p className="text-text-muted text-sm sm:text-base leading-relaxed mb-6 sm:mb-8">
            {episode.fullDescription}
          </p>

          {/* Episode 4: Apply CTA */}
          {episodeNum === 4 && (
            <div className="bg-surface border border-primary/30 rounded-xl p-5 sm:p-8 text-center mb-6 sm:mb-8">
              <h2 className="font-serif text-lg sm:text-xl font-bold mb-3">
                準備はできましたか？
              </h2>
              <p className="text-text-muted text-sm sm:text-base mb-4 sm:mb-6">
                AI Builders Labで、作れる側の人間になりましょう。
              </p>
              <Button href="/apply" className="text-base sm:text-lg py-3 px-8 sm:px-10">
                今すぐ申し込む
              </Button>
            </div>
          )}

          {/* Email Registration Form */}
          <EmailForm />

          {/* Navigation */}
          <div className="flex justify-between items-center pt-8 mt-8 border-t border-border">
            {prevEp ? (
              <Link
                href={`/launch/episode/${prevEp}`}
                className="text-text-muted hover:text-primary transition-colors"
              >
                ← 第{prevEp}話
              </Link>
            ) : (
              <span />
            )}
            <Link
              href="/launch"
              className="text-text-muted hover:text-primary transition-colors text-sm"
            >
              一覧に戻る
            </Link>
            {nextEp ? (
              <Link
                href={`/launch/episode/${nextEp}`}
                className="text-text-muted hover:text-primary transition-colors"
              >
                第{nextEp}話 →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
