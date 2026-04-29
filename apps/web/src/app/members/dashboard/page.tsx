import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Card from "@/components/ui/Card";
import { getPlanLabel, getPlanAccess } from "@/lib/plans";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("name, plan, community_free_until")
    .eq("email", user?.email)
    .single();

  const name = profile?.name ?? user?.user_metadata?.name ?? "会員";
  const plan = profile?.plan ?? null;
  const access = getPlanAccess(plan);

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Progress: count watched weeks from video_watches
  const { data: watchedVideos } = await supabase
    .from("video_watches")
    .select("video_id, videos(week)")
    .eq("user_id", user?.id);

  const watchedWeeks = new Set<number>();
  if (watchedVideos) {
    for (const w of watchedVideos) {
      const video = w.videos as unknown as { week: number } | null;
      if (video?.week) watchedWeeks.add(video.week);
    }
  }
  const completedWeeks = watchedWeeks.size;
  const progressPercent = Math.round((completedWeeks / 8) * 100);

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="font-serif text-xl sm:text-2xl font-bold mb-2">
          ようこそ、<span className="text-primary">{name}</span> さん
        </h1>
        <p className="text-text-muted text-sm">
          現在のプラン: {getPlanLabel(plan)}
        </p>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <h2 className="font-bold mb-3">受講進捗</h2>
        <div className="w-full bg-bg rounded-full h-3 mb-2">
          <div
            className="bg-primary rounded-full h-3 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-text-muted text-sm">
          {completedWeeks > 0
            ? `Week ${completedWeeks} / 8 完了`
            : "まだ動画を視聴していません"}
        </p>
      </Card>

      {/* Zoom Info (Zoom plan only) */}
      {access.zoom && (
        <Card className="mb-6 border-primary/30">
          <h2 className="font-bold mb-2">次回Zoomセミナー</h2>
          <p className="text-text-muted text-sm mb-3">
            日程が決まり次第、こちらに表示されます。
          </p>
        </Card>
      )}

      {/* Announcements */}
      <Card className="mb-6">
        <h2 className="font-bold mb-4">お知らせ</h2>
        {announcements && announcements.length > 0 ? (
          <ul className="space-y-3">
            {announcements.map((a) => (
              <li key={a.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <p className="text-text-muted text-xs mb-1">
                  {new Date(a.created_at).toLocaleDateString("ja-JP")}
                </p>
                <p className="font-bold text-sm">{a.title}</p>
                {a.body && (
                  <p className="text-text-muted text-sm mt-1 line-clamp-2">
                    {a.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-muted text-sm">お知らせはまだありません</p>
        )}
      </Card>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/members/videos">
          <Card className="hover:border-primary/50 transition-colors text-center py-6 sm:py-8">
            <div className="text-3xl mb-2">🎬</div>
            <p className="font-bold text-sm">動画ライブラリ</p>
          </Card>
        </Link>
        <Link href="/members/materials">
          <Card className="hover:border-primary/50 transition-colors text-center py-6 sm:py-8">
            <div className="text-3xl mb-2">📄</div>
            <p className="font-bold text-sm">資料ダウンロード</p>
          </Card>
        </Link>
        <Link href={access.community ? "/members/community" : "/members/mypage"}>
          <Card className="hover:border-primary/50 transition-colors text-center py-6 sm:py-8">
            <div className="text-3xl mb-2">{access.community ? "💬" : "👤"}</div>
            <p className="font-bold text-sm">
              {access.community ? "コミュニティ" : "マイページ"}
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
