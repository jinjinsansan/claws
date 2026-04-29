"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Card from "@/components/ui/Card";
import { episodes } from "@/lib/episodes";

export default function LaunchPage() {
  const [watched, setWatched] = useState<number[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("abl-watched");
      if (stored) setWatched(JSON.parse(stored));
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-bg text-text-main">
      <Header />
      <main className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
            無料ローンチ<span className="text-primary">動画シリーズ</span>
          </h1>
          <p className="text-text-muted text-sm sm:text-base text-center mb-8 sm:mb-12">
            全4話であなたの可能性が変わる
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            {episodes.map((ep) => (
              <Link key={ep.number} href={`/launch/episode/${ep.number}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full relative">
                  {watched.includes(ep.number) && (
                    <span className="absolute top-3 right-3 bg-primary text-bg text-xs font-bold px-2 py-1 rounded-full">
                      視聴済み
                    </span>
                  )}
                  <div className="w-full aspect-video bg-bg rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-primary text-4xl font-serif font-bold">
                      {ep.number}
                    </span>
                  </div>
                  <span className="text-primary text-sm font-bold">
                    第{ep.number}話
                  </span>
                  <h2 className="font-bold text-lg mt-1 mb-2">{ep.title}</h2>
                  <p className="text-text-muted text-sm">{ep.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
