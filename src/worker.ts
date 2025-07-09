/**
 * Cloudflare Worker for AccentShadow Vue SPA
 * Serves static assets from subdirectory with proper routing
 */

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

const BASE_PATH = '/language-learning/accent-shadow';

function addSecurityHeaders(response: Response) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'microphone=*');
  response.headers.set('Feature-Policy', 'microphone *');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Only handle requests to our subdirectory
    if (!url.pathname.startsWith(BASE_PATH)) {
      return new Response('Not Found', { status: 404 });
    }
    
    // Strip base path for asset lookup
    const assetPath = url.pathname.substring(BASE_PATH.length) || '/';
    const assetRequest = new Request(new URL(assetPath, url.origin), request);
    
    // Try to serve static asset
    const assetResponse = await env.ASSETS.fetch(assetRequest);
    
    if (assetResponse.status !== 404) {
      // Asset found - add headers and return
      const response = new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers: new Headers(assetResponse.headers)
      });
      
      addSecurityHeaders(response);
      
      // Add caching based on asset type
      if (assetPath.startsWith('/assets/')) {
        response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (assetPath.endsWith('.mp3') || assetPath.endsWith('.wav')) {
        response.headers.set('Cache-Control', 'public, max-age=86400');
        response.headers.set('Access-Control-Allow-Origin', '*');
      }
      
      return response;
    }
    
    // Asset not found - serve index.html for SPA routing
    const indexResponse = await env.ASSETS.fetch(new Request(new URL('/index.html', url.origin)));
    
    if (indexResponse.status === 404) {
      return new Response('Not Found', { status: 404 });
    }
    
    const response = new Response(indexResponse.body, {
      status: indexResponse.status,
      statusText: indexResponse.statusText,
      headers: new Headers(indexResponse.headers)
    });
    
    response.headers.set('Content-Type', 'text/html; charset=utf-8');
    addSecurityHeaders(response);
    
    return response;
  },
};