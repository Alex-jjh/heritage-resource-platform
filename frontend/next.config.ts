import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy /api/* requests to the backend server.
  // This avoids HTTPS/HTTP mixed-content issues when the frontend is on
  // Amplify (HTTPS) and the backend is on a plain HTTP EC2 instance.
  //
  // >>> TEMPORARY: Remove this block once the backend has its own HTTPS
  //     endpoint (e.g. CloudFront or a custom domain with ACM certificate).
  //     Then set NEXT_PUBLIC_API_URL to the HTTPS backend URL instead.
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL ?? "http://32.193.71.47:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
