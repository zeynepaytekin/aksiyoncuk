import type { NextConfig } from "next";

const isPagesDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const nextConfig: NextConfig = {
  ...(isPagesDemo
    ? {
        output: "export" as const,
        basePath: "/aksiyoncuk",
        trailingSlash: true,
      }
    : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
