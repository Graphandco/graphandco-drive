/** @type {import('next').NextConfig} */
const nextConfig = {
   output: "standalone",
   serverExternalPackages: ["sharp"],
   experimental: {
      // Uploads via Server Actions (max app = 50 Mo)
      serverActions: {
         bodySizeLimit: "500mb",
      },
      // proxy.js bufferise le body (défaut 10 Mo) — doit couvrir les uploads
      proxyClientMaxBodySize: "500mb",
   },
};

export default nextConfig;
