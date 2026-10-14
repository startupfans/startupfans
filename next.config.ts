import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg"],
  outputFileTracingIncludes: {
    "/api/media/transcode": [
      "./node_modules/.pnpm/@ffmpeg-installer+*/node_modules/@ffmpeg-installer/*/ffmpeg",
      "./node_modules/.pnpm/@ffmpeg-installer+*/node_modules/@ffmpeg-installer/**/*.js",
      "./node_modules/.pnpm/@ffmpeg-installer+*/node_modules/@ffmpeg-installer/**/package.json",
    ],
  },
  images: {
    remotePatterns: [{
      protocol: "https",
      hostname: "*.public.blob.vercel-storage.com",
      port: "",
      pathname: "/startups/**",
      search: "",
    }, {
      protocol: "https",
      hostname: "*.public.blob.vercel-storage.com",
      port: "",
      pathname: "/users/*/replies/**",
      search: "",
    }, {
      protocol: "https",
      hostname: "*.public.blob.vercel-storage.com",
      port: "",
      pathname: "/users/*/reshares/**",
      search: "",
    }, {
      protocol: "https",
      hostname: "*.public.blob.vercel-storage.com",
      port: "",
      pathname: "/users/*/avatar/**",
      search: "",
    }, {
      protocol: "https",
      hostname: "avatars.githubusercontent.com",
      port: "",
      pathname: "/u/**",
    }, {
      protocol: "https",
      hostname: "miniti.app",
      port: "",
      pathname: "/images/**",
      search: "",
    }, {
      protocol: "https",
      hostname: "agentshrine.com",
      port: "",
      pathname: "/favicon.svg",
      search: "",
    }],
  },
};

export default nextConfig;
