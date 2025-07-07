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
      // Create new response with original body and status but new headers
      const response = new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers: new Headers(assetResponse.headers) // Start with original headers
      });
      
      // Add security headers (will override any existing ones)
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Critical: Add permissions policy headers for all assets
      response.headers.set('Permissions-Policy', 'microphone=*');
      response.headers.set('Feature-Policy', 'microphone *');
      
      // Debug: Log permissions policy for HTML files
      if (url.pathname.endsWith('.html') || url.pathname === '/') {
        console.log(`🎤 Worker: Set permissions policy for ${url.pathname}`);
      }
      
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
      status: indexResponse.status,
      statusText: indexResponse.statusText,
      headers: new Headers(indexResponse.headers) // Start with original headers
    });
    
    // Override/add critical headers
    response.headers.set('Content-Type', 'text/html; charset=utf-8');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Critical: Ensure permissions policy headers are set
    response.headers.set('Permissions-Policy', 'microphone=*');
    response.headers.set('Feature-Policy', 'microphone *');
    
    // Debug: Log SPA route permissions policy
    console.log(`🎤 Worker: Set permissions policy for SPA route ${url.pathname}`);
    
    return response;
  },
};