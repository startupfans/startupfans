"use client";

import { useEffect, useRef } from "react";

function setRatio(video: HTMLVideoElement, width: number, height: number) {
  if (width > 0 && height > 0) {
    video.style.aspectRatio = `${width} / ${height}`;
    video.style.width = `${Math.min(width, 320 * width / height)}px`;
  }
}

export function PostVideo({ mediaUrl, mediaPosterUrl, quickTime }: {
  mediaUrl: string;
  mediaPosterUrl: string | null;
  quickTime: boolean;
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
    <video ref={videoRef} poster={mediaPosterUrl ?? undefined} controls playsInline preload="none"
      className="block h-auto max-h-80 w-auto max-w-full" style={{ aspectRatio: "1", width: "300px" }} aria-label="Post video attachment"
      onLoadedMetadata={({ currentTarget }) => setRatio(currentTarget, currentTarget.videoWidth, currentTarget.videoHeight)}>
      {quickTime && <source src={mediaUrl} type="video/quicktime" />}
      <source src={mediaUrl} />
    </video>
  );
}
