import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // On Alibaba Cloud ECS, Nginx handles the reverse proxy:
  //   /api/* → localhost:8080 (Spring Boot)
  //   everything else → Next.js static files
  // No rewrites needed — Nginx does the routing.
  output: "standalone",
};

export default nextConfig;
