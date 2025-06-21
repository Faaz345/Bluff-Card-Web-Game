/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['hbhhkgcbtckduabhdzgk.supabase.co'],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://hbhhkgcbtckduabhdzgk.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiaGhrZ2NidGNrZHVhYmhkemdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MDI0NDMsImV4cCI6MjA2NjA3ODQ0M30.C_eY8jUPb1xyJFtwnWQduUjsVTuS-TeGRBD2ddb2TYg'
  }
};

module.exports = nextConfig; 