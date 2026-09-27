import { handleApi } from './api.mjs';
import { assets } from './assets.mjs';

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    let response;
    if (path.startsWith('/api/')) response = await handleApi(request, env);
    else {
      const asset = assets[path];
      response = asset ? new Response(asset.body, {headers:{'Content-Type':asset.type}})
        : new Response('Página no encontrada', {status:404});
    }
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'same-origin');
    response.headers.set('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'");
    return response;
  }
};
