/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/api/photos/[name]": ["./private/photos/**"],
  },
};
export default nextConfig;
