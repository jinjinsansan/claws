"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { siteConfig } from "@/lib/siteConfig";

function useCountdown(deadline: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(deadline).getTime();

    function update() {
      const now = Date.now();
      const diff = Math.max(0, target - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return timeLeft;
}

export default function CTASection() {
  const { cohort, label, remainingSlots, deadline, isOpen } =
    siteConfig.recruitment;
  const countdown = useCountdown(deadline);

  const deadlineDate = new Date(deadline);
  const formattedDeadline = `${deadlineDate.getFullYear()}年${
    deadlineDate.getMonth() + 1
  }月${deadlineDate.getDate()}日`;

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
          さあ、<span className="text-primary">作れる側の人間</span>になろう
        </h2>
        {isOpen ? (
          <>
            {/* Countdown Timer */}
            <div className="flex justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              {[
                { value: countdown.days, unit: "日" },
                { value: countdown.hours, unit: "時間" },
                { value: countdown.minutes, unit: "分" },
                { value: countdown.seconds, unit: "秒" },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-surface border border-primary/30 rounded-xl flex items-center justify-center mb-1">
                    <span className="font-serif text-xl sm:text-2xl font-bold text-primary">
                      {String(item.value).padStart(2, "0")}
                    </span>
                  </div>
                  <span className="text-text-muted text-[10px] sm:text-xs">{item.unit}</span>
                </div>
              ))}
            </div>

            <p className="text-text-muted text-sm sm:text-base mb-2 leading-relaxed">
              第{cohort}期生の募集は限定人数での受付となります。<br className="sm:hidden" />定員に達し次第、募集を締め切ります。
            </p>
            <p className="text-text-muted text-xs sm:text-sm mb-2">
              締切: {formattedDeadline}
            </p>
            <p className="text-primary font-bold text-base sm:text-lg mb-8 sm:mb-10">
              {label}募集中 ― 残り{remainingSlots}枠
            </p>
          </>
        ) : (
          <p className="text-text-muted mb-10 leading-relaxed">
            現在募集は締め切っております。次期募集をお待ちください。
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isOpen && (
            <Button href="/apply" className="text-base sm:text-lg py-3 sm:py-4 px-8 sm:px-12">
              今すぐ申し込む
            </Button>
          )}
          <Button
            href="/launch/episode/1"
            variant="outline"
            className="text-base sm:text-lg py-3 sm:py-4 px-8 sm:px-12"
          >
            まずは無料動画を見る
          </Button>
        </div>
      </div>
    </section>
  );
}
