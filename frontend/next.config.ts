import type { NextConfig } from "next";

const repoName = "aksiyoncuk";
const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,

  basePath: isProduction ? `/${repoName}` : "",
  assetPrefix: isProduction ? `/${repoName}/` : "",

  images: {
    unoptimized: true,
  },
};

export default nextConfig;