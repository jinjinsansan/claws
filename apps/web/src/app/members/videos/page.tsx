import { createServerSupabaseClient } from "@/lib/supabase/server";
import Card from "@/components/ui/Card";
import VideoCard from "@/components/members/VideoCard";

interface Video {
  id: string;
  week: number;
  title: string;
  description: string | null;
  cloudflare_video_id: string | null;
  unlocked_at: string | null;
}

export default async function VideosPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: videos } = await supabase
    .from("videos")
    .select("id, week, title, description, cloudflare_video_id, unlocked_at")
    .order("week", { ascending: true });

  // Get watched video IDs
  const { data: watches } = await supabase
    .from("video_watches")
    .select("video_id")
    .eq("user_id", user?.id);

  const watchedIds = new Set((watches ?? []).map((w) => w.video_id));

  const weeks = Array.from({ length: 8 }, (_, i) => i + 1);
  const videosByWeek = weeks.map((w) => ({
    week: w,
    videos: (videos ?? []).filter((v: Video) => v.week === w),
  }));

  const now = new Date();

  return (
    <div>
      <h1 className="font-serif text-xl sm:text-2xl font-bold mb-2">動画ライブラリ</h1>
      <p className="text-text-muted text-sm mb-4 sm:mb-8">
        週ごとに講義動画を視聴できます
      </p>

      <div className="space-y-6 sm:space-y-8">
        {videosByWeek.map(({ week, videos: weekVideos }) => {
          const isUnlocked =
            weekVideos.length > 0 &&
            weekVideos.some(
              (v: Video) => v.unlocked_at && new Date(v.unlocked_at) <= now
            );

          return (
            <div key={week}>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`font-bold text-sm px-3 py-1 rounded-full ${
                    isUnlocked
                      ? "bg-primary/20 text-primary"
                      : "bg-border/50 text-text-muted"
                  }`}
                >
                  Week {week}
                </span>
                {!isUnlocked && (
                  <span className="text-text-muted text-xs">未公開</span>
                )}
              </div>

              {isUnlocked ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {weekVideos
                    .filter(
                      (v: Video) =>
                        v.unlocked_at && new Date(v.unlocked_at) <= now
                    )
                    .map((video: Video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        watched={watchedIds.has(video.id)}
                        userId={user?.id ?? ""}
                      />
                    ))}
                </div>
              ) : (
                <Card className="opacity-60">
                  <div className="flex items-center gap-3 py-4">
                    <span className="text-2xl">🔒</span>
                    <div>
                      <p className="font-bold text-sm">
                        Week {week} の講義動画
                      </p>
                      <p className="text-text-muted text-xs">
                        管理者によるアンロック後に視聴可能になります
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
