import type { NextConfig } from 'next';
const config: NextConfig = { poweredByHeader: false, serverExternalPackages: ['pg'], images: { remotePatterns: [{protocol:'https',hostname:'images.unsplash.com'},{protocol:'https',hostname:'axgssaxlsunkqmmzyjag.supabase.co'}] }, async headers(){ return [{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'}]}]; } };
export default config;
