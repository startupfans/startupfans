"use client";

import { useEffect, useRef } from "react";

function setRatio(video: HTMLVideoElement, width: number, height: number) {
  if (width > 0 && height > 0) {
    video.style.aspectRatio = `${width} / ${height}`;
  }
}

export function PostVideo({ mediaUrl, mediaPosterUrl, quickTime, preload = "none" }: {
  mediaUrl: string;
  mediaPosterUrl: string | null;
  quickTime: boolean;
  preload?: "metadata" | "none";
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setRatio(video, video.videoWidth, video.videoHeight);
    if (!mediaPosterUrl || video.videoWidth > 0) return;

    const poster = new window.Image();
    poster.onload = () => {
      if (video.videoWidth === 0 && poster.naturalWidth > 0 && poster.naturalHeight > 0) {
        setRatio(video, poster.naturalWidth, poster.naturalHeight);
      }
    };
    poster.src = mediaPosterUrl;
    return () => { poster.onload = null; };
  }, [mediaUrl, mediaPosterUrl]);

  return (
    <video ref={videoRef} poster={mediaPosterUrl ?? undefined} controls playsInline preload={preload}
      className="block h-auto w-full" style={{ aspectRatio: "1" }} aria-label="Post video attachment"
      onLoadedMetadata={({ currentTarget }) => setRatio(currentTarget, currentTarget.videoWidth, currentTarget.videoHeight)}>
      {quickTime && <source src={mediaUrl} type="video/quicktime" />}
      <source src={mediaUrl} />
    </video>
  );
}
