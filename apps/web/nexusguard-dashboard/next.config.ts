import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained .next/standalone build with only the files the server actually
  // needs (including a pruned node_modules) - the production Docker image copies just that,
  // instead of shipping the full source tree + devDependencies.
  output: "standalone",
};

export default nextConfig;
