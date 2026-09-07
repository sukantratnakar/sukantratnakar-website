/**
 * Sukant Ratnakar Website - Admin API
 * Cloudflare Worker with KV storage
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Auth',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Route handling
    if (path === '/api/content' && request.method === 'GET') {
      return handleGetContent(request, env);
    }

    if (path === '/api/admin/save' && request.method === 'POST') {
      return handleSaveContent(request, env);
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  },
};

// Get content (public)
async function handleGetContent(request, env) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');

  const validTypes = ['diary', 'papers', 'books', 'podcast'];
  if (!type || !validTypes.includes(type)) {
    return new Response(JSON.stringify({ error: 'Invalid type. Use: diary, papers, books, podcast' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const data = await env.CONTENT.get(type, 'json');
    return new Response(JSON.stringify(data || []), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}

// Save content (authenticated)
async function handleSaveContent(request, env) {
  // Check authentication
  const authHeader = request.headers.get('X-Admin-Auth');
  if (authHeader !== env.ADMIN_PASSWORD_HASH) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { type, data } = body;

    const validTypes = ['diary', 'papers', 'books', 'podcast'];
    if (!type || !validTypes.includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid type' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Save to KV
    await env.CONTENT.put(type, JSON.stringify(data));

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
