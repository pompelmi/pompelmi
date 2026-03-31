import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@pompelmi/ui-react"],
  experimental: { externalDir: true },
  webpack: (config) => {
    // Risolvi il pacchetto direttamente al build locale
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@pompelmi/ui-react": path.resolve(__dirname, "../../packages/ui-react/dist"),
    };
    return config;
  },
};

export default nextConfig;
