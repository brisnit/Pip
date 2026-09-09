import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libsql is a native module: it must stay outside the bundle so the platform
  // binary is traced and shipped rather than inlined.
  serverExternalPackages: ["libsql"],
};

export default nextConfig;
