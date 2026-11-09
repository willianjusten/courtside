/** @type {import('next').NextConfig} */
const nextConfig = {
  // Memoizes components automatically, so live polling only re-renders the games whose data changed.
  reactCompiler: true,
};

export default nextConfig;
