/**
 * Cloudflare Worker for AccentShadow Vue SPA
 * Serves static assets and handles SPA routing
 */

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Try to serve the static asset first
    const assetResponse = await env.ASSETS.fetch(request);
    
    // If asset exists, return it with appropriate headers
    if (assetResponse.status !== 404) {
      const response = new Response(assetResponse.body, assetResponse);
      
      // Add security headers
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      response.headers.set('Permissions-Policy', 'microphone=*');
      
      // Cache static assets aggressively
      if (url.pathname.startsWith('/assets/')) {
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      
      // Cache audio files
      if (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav')) {
        response.headers.set('Cache-Control', 'public, max-age=86400');
        response.headers.set('Access-Control-Allow-Origin', '*');
      }
      
      return response;
    }
    
    // For SPA routing - serve index.html for all non-asset routes
    const indexRequest = new Request(new URL('/index.html', request.url), request);
    const indexResponse = await env.ASSETS.fetch(indexRequest);
    
    if (indexResponse.status === 404) {
      return new Response('Not Found', { status: 404 });
    }
    
    // Return index.html with proper headers for SPA routes
    const response = new Response(indexResponse.body, {
      ...indexResponse,
      headers: {
        ...Object.fromEntries(indexResponse.headers),
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'microphone=*',
      },
    });
    
    return response;
  },
};