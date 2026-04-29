"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

interface Video {
  id: string;
  title: string;
  description: string | null;
  cloudflare_video_id: string | null;
}

export default function VideoCard({
  video,
  watched: initialWatched,
  userId,
}: {
  video: Video;
  watched: boolean;
  userId: string;
}) {
  const [watched, setWatched] = useState(initialWatched);

  const markWatched = async () => {
    if (watched) return;
    const supabase = createClient();
    const { error } = await supabase.from("video_watches").upsert(
      { user_id: userId, video_id: video.id },
      { onConflict: "user_id,video_id" }
    );
    if (!error) setWatched(true);
  };

  return (
    <Card className="hover:border-primary/50 transition-colors relative">
      {watched && (
        <span className="absolute top-3 right-3 bg-primary text-bg text-xs font-bold px-2 py-1 rounded-full z-10">
          視聴済み
        </span>
      )}
      <div className="w-full aspect-video bg-bg rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        {video.cloudflare_video_id ? (
          <iframe
            src={`https://iframe.videodelivery.net/${video.cloudflare_video_id}`}
            className="w-full h-full"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <span className="text-text-muted text-sm">動画準備中</span>
        )}
      </div>
      <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-sm">{video.title}</h3>
          {video.description && (
            <p className="text-text-muted text-xs mt-1">{video.description}</p>
          )}
        </div>
        {!watched && (
          <button
            onClick={markWatched}
            className="shrink-0 text-text-muted hover:text-primary text-xs border border-border hover:border-primary rounded px-2 py-1 transition-colors"
          >
            視聴済みにする
          </button>
        )}
      </div>
    </Card>
  );
}
