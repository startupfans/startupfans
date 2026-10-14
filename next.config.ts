import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    }],
  },
};

export default nextConfig;
