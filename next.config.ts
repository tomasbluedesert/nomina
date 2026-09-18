import type { NextConfig } from 'next';
const config: NextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
  // Incluir la carpeta docs en el paquete serverless (Netlify) para que /manual pueda leerla en runtime
  outputFileTracingIncludes: { '/manual': ['./docs/**/*'], '/manual/[slug]': ['./docs/**/*'] },
};
export default config;
