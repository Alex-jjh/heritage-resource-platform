import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Docker / 本地开发：把 /api 请求代理到后端
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL || "http://backend:8080"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
