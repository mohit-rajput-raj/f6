import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    ORG_PAGE: process.env.ORG_PAGE || "http://localhost:3004/register",
  },
  serverExternalPackages: ["@prisma/client"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.magnific.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.magnific.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
