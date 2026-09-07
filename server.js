require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { createCanvas, registerFont } = require('canvas');

const PORT = 8082;
const APP_DIR = path.join(__dirname, 'app');
const NOTION_CONFIG = '/Users/sukantclawdbot/.config/notion/crm_config.json';
const NOTION_KEY_FILE = '/Users/sukantclawdbot/.config/notion/api_key';

// Load Notion config
let crmConfig = {};
let notionKey = '';
try {
  crmConfig = JSON.parse(fs.readFileSync(NOTION_CONFIG, 'utf8'));
  notionKey = fs.readFileSync(NOTION_KEY_FILE, 'utf8').trim();
} catch (e) {
  console.log('Notion config not loaded:', e.message);
}

// Notion API helper
function notionRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.notion.com',
      path: '/v1' + endpoint,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + notionKey,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

const server = http.createServer(async (req, res) => {
  // Log requests for debugging
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // HTTPS redirect (when behind Cloudflare/proxy)
  const proto = req.headers['x-forwarded-proto'];
  const host = req.headers.host || 'www.quantraz.com';
  if (proto === 'http' && !host.includes('localhost')) {
    res.writeHead(301, { 'Location': `https://${host}${req.url}` });
    res.end();
    return;
  }
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Auth');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Lead submission API (proxies to website-crm)
  if (req.url === '/api/lead' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const lead = JSON.parse(body);
        
        // Forward to website-crm service
        const response = await fetch('http://localhost:3470/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            source: lead.source || 'brochure-download',
            utm: lead.utm || {}
          })
        });
        
        const result = await response.json();
        res.writeHead(response.ok ? 200 : 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error('Lead submission error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Submission failed' }));
      }
    });
    return;
  }
  
  // PDF Download endpoint - secure booklet download
  if (req.url === '/api/download/booklet' && req.method === 'GET') {
    const pdfPath = path.join(APP_DIR, 'downloads', 'TIA_2026.pdf');
    
    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('PDF not found');
      return;
    }
    
    // Log download
    console.log(`[${new Date().toISOString()}] PDF Download: The Invisible Architecture`);
    
    // Serve PDF with download headers
    const stats = fs.statSync(pdfPath);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': stats.size,
      'Content-Disposition': 'attachment; filename="The_Invisible_Architecture.pdf"',
      'Cache-Control': 'no-cache'
    });
    
    fs.createReadStream(pdfPath).pipe(res);
    return;
  }
  
  // Click tracking API
  if (req.url === '/api/track' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        // Forward to website-crm clicks endpoint
        await fetch('http://localhost:3470/api/clicks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
    return;
  }
  
  // Admin API endpoint
  if (req.url === '/api/admin/save' && req.method === 'POST') {
    return handleAdminSave(req, res);
  }
  
  // CRM API endpoint (Offline Pipeline)
  // AI Deep Dive endpoint
  if (req.url === '/api/ai-explain' && req.method === 'POST') {
    return handleAIExplain(req, res);
  }
  
  if (req.url === '/api/crm/contacts' && req.method === 'GET') {
    try {
      const data = await notionRequest('POST', `/databases/${crmConfig.crm.contacts_db}/query`, {
        sorts: [{ property: 'Next Follow-up', direction: 'ascending' }]
      });
      
      const contacts = (data.results || []).map(page => {
        const props = page.properties;
        return {
          id: page.id,
          name: props.Name?.title?.[0]?.plain_text || '',
          company: props.Company?.rich_text?.[0]?.plain_text || '',
          role: props.Role?.rich_text?.[0]?.plain_text || '',
          email: props.Email?.email || '',
          phone: props.Phone?.phone_number || '',
          industry: props.Industry?.select?.name || '',
          stage: props.Stage?.select?.name || '',
          temperature: props.Temperature?.select?.name || '',
          offered: (props.Offered?.multi_select || []).map(o => o.name),
          nextFollowup: props['Next Follow-up']?.date?.start || '',
          nextAction: props['Next Action']?.rich_text?.[0]?.plain_text || '',
          notes: props.Notes?.rich_text?.[0]?.plain_text || '',
          source: props.Source?.select?.name || ''
        };
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ contacts }));
    } catch (err) {
      console.error('CRM API error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch contacts' }));
    }
    return;
  }
  
  // CRM-L API endpoint (LinkedIn Pipeline)
  if (req.url === '/api/crm-l/contacts' && req.method === 'GET') {
    try {
      const data = await notionRequest('POST', `/databases/${crmConfig.crm_l.contacts_db}/query`, {
        sorts: [{ property: 'Next Follow-up', direction: 'ascending' }]
      });
      
      const contacts = (data.results || []).map(page => {
        const props = page.properties;
        return {
          id: page.id,
          name: props.Name?.title?.[0]?.plain_text || '',
          company: props.Company?.rich_text?.[0]?.plain_text || '',
          role: props.Role?.rich_text?.[0]?.plain_text || '',
          linkedin: props.LinkedIn?.url || '',
          industry: props.Industry?.select?.name || '',
          stage: props.Stage?.select?.name || '',
          temperature: props.Temperature?.select?.name || '',
          offered: (props.Offered?.multi_select || []).map(o => o.name),
          nextFollowup: props['Next Follow-up']?.date?.start || '',
          nextAction: props['Next Action']?.rich_text?.[0]?.plain_text || '',
          notes: props.Notes?.rich_text?.[0]?.plain_text || '',
          source: props.Source?.select?.name || ''
        };
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ contacts }));
    } catch (err) {
      console.error('CRM-L API error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch contacts' }));
    }
    return;
  }
  
  // Save quotes API
  if (req.url === '/api/quotes/save' && req.method === 'POST') {
    return handleQuotesSave(req, res);
  }
  
  // OG Image generation for quotes
  const ogQuoteMatch = req.url.match(/^\/api\/og\/quote\/(.+)$/);
  if (ogQuoteMatch) {
    return handleOGQuoteImage(ogQuoteMatch[1], res);
  }
  
  // Individual quote page
  const quotePageMatch = req.url.match(/^\/explore\/quotes\/([^\/]+)\/?$/);
  if (quotePageMatch && quotePageMatch[1] !== 'index.html') {
    return handleQuotePage(quotePageMatch[1], req, res);
  }
  
  let filePath = req.url === '/' ? '/index.html' : req.url;
  
  // Remove query strings
  filePath = filePath.split('?')[0];
  
  // Security: prevent directory traversal
  filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  
  // Handle directory URLs (e.g., /explore/) by looking for index.html
  if (filePath.endsWith('/')) {
    filePath = filePath + 'index.html';
  }
  
  const fullPath = path.join(APP_DIR, filePath);
  const ext = path.extname(fullPath).toLowerCase();
  
  // Check if path is a directory - redirect to add trailing slash
  fs.stat(fullPath, (statErr, stats) => {
    if (!statErr && stats.isDirectory()) {
      // Redirect /explore to /explore/ so index.html is served
      res.writeHead(301, { 'Location': req.url + '/' });
      res.end();
      return;
    }
    
    // Check if file exists
    fs.access(fullPath, fs.constants.R_OK, (err) => {
    if (err) {
      // Try adding .html extension for clean URLs (future pages)
      const htmlPath = fullPath + '.html';
      fs.access(htmlPath, fs.constants.R_OK, (err2) => {
        if (err2) {
          // Serve index.html for SPA routing (future support)
          const indexPath = path.join(APP_DIR, 'index.html');
          fs.readFile(indexPath, (err3, data) => {
            if (err3) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Not Found');
              return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
          });
        } else {
          serveFile(htmlPath, 'text/html', res);
        }
      });
      return;
    }
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    serveFile(fullPath, contentType, res);
    });
  });
});

function serveFile(filePath, contentType, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error('File read error:', filePath, err.code);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server Error');
      return;
    }
    
    // Cache static assets (disabled for now to force refresh)
    const cacheControl = contentType.startsWith('image/') || contentType.startsWith('font/')
      ? 'public, max-age=31536000'
      : 'no-cache, no-store, must-revalidate';
    
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    });
    res.end(data);
  });
}

server.listen(PORT, () => {
  console.log(`✓ Website server running on http://localhost:${PORT}`);
});

// Admin API endpoint - Save content
const ADMIN_PASSWORD_HASH = 'c2a450fbb1559ae393e79372173cb1e3cf1149d99bcd2072fc120594f49db935'; // SHA-256 of 'quantraz2026'
const DATA_DIR = path.join(APP_DIR, 'data');

async function handleAdminSave(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      // Check authentication
      const authHeader = req.headers['x-admin-auth'];
      if (authHeader !== ADMIN_PASSWORD_HASH) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      
      const { type, data } = JSON.parse(body);
      
      // Validate type
      const validTypes = ['diary', 'papers', 'books', 'podcast'];
      if (!validTypes.includes(type)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid type' }));
        return;
      }
      
      // Ensure data directory exists
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      
      // Write data to file
      const filePath = path.join(DATA_DIR, `${type}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      console.error('Admin save error:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// AI Deep Dive API endpoint
async function handleAIExplain(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { term, meaning } = JSON.parse(body);
      
      // Use Groq API
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API key not configured' }));
        return;
      }
      
      const prompt = `You are a language expert helping someone learn North American English expressions. 

For the term/expression: "${term}"
Basic meaning: "${meaning}"

Provide a detailed explanation in HTML format with these sections:
1. <h4>📖 Full Definition</h4> - Expanded definition with nuance
2. <h4>💬 Example Sentences</h4> - 2-3 real-world examples as <ul><li>
3. <h4>✅ When to Use</h4> - Appropriate contexts
4. <h4>❌ When NOT to Use</h4> - Situations to avoid
5. <h4>🔄 Similar Expressions</h4> - 2-3 alternatives

Keep it practical and conversational. No markdown, just HTML tags.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + groqKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 800,
          temperature: 0.7
        })
      });
      
      const data = await response.json();
      const html = data.choices?.[0]?.message?.content || '<p>Could not generate explanation</p>';
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ html }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// Load quotes data
function loadQuotes() {
  try {
    const quotesPath = path.join(APP_DIR, 'data', 'quotes.json');
    return JSON.parse(fs.readFileSync(quotesPath, 'utf8'));
  } catch (e) {
    console.error('Failed to load quotes:', e);
    return [];
  }
}

// Save quotes
function handleQuotesSave(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const quotes = JSON.parse(body);
      const quotesPath = path.join(APP_DIR, 'data', 'quotes.json');
      fs.writeFileSync(quotesPath, JSON.stringify(quotes, null, 2));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: quotes.length }));
    } catch (e) {
      console.error('Failed to save quotes:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

// Generate OG image for a quote
function handleOGQuoteImage(quoteId, res) {
  const quotes = loadQuotes();
  const quote = quotes.find(q => q.id === quoteId);
  
  if (!quote) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Quote not found');
    return;
  }
  
  const size = 1200;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#0a0a0f');
  gradient.addColorStop(1, '#1a1a24');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Decorative quote mark
  ctx.font = 'bold 500px Georgia, serif';
  ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
  ctx.textAlign = 'left';
  ctx.fillText('"', 40, 380);
  
  // Accent line (removed)
  // ctx.fillStyle = '#6366f1';
  // ctx.fillRect(90, 480, 5, 280);
  
  // Quote text
  ctx.fillStyle = '#f5f5f7';
  ctx.textAlign = 'center';
  const quoteText = quote.text;
  
  let fontSize = quoteText.length > 150 ? 48 : quoteText.length > 100 ? 56 : quoteText.length > 60 ? 64 : 72;
  ctx.font = `500 ${fontSize}px Georgia, serif`;
  
  // Word wrap
  const maxWidth = size - 200;
  const lineHeight = fontSize * 1.4;
  const words = quoteText.split(' ');
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);
  
  // Center vertically
  const totalHeight = lines.length * lineHeight;
  let startY = (size - totalHeight) / 2 + lineHeight / 2;
  
  lines.forEach((line, i) => {
    ctx.fillText(line, size / 2, startY + i * lineHeight);
  });
  
  // Author
  ctx.font = '36px Arial, sans-serif';
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText('— Sukant Ratnakar', size / 2, startY + lines.length * lineHeight + 70);
  
  // Website
  ctx.font = '28px Arial, sans-serif';
  // ctx.fillStyle = '#6366f1';
  ctx.fillText('www.quantraz.com', size / 2, size - 70);
  
  // Send image
  const buffer = canvas.toBuffer('image/png');
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, max-age=86400'
  });
  res.end(buffer);
}

// Serve individual quote page with proper OG tags
function handleQuotePage(quoteId, req, res) {
  const quotes = loadQuotes();
  const quote = quotes.find(q => q.id === quoteId);
  
  if (!quote) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>Quote not found</h1><a href="/explore/quotes">Back to Quotes</a></body></html>');
    return;
  }
  
  const host = req.headers.host || 'www.quantraz.com';
  const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;
  const quoteUrl = `${baseUrl}/explore/quotes/${quoteId}`;
  const ogImageUrl = `${baseUrl}/api/og/quote/${quoteId}`;
  const escapedText = quote.text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>"${escapedText.substring(0, 60)}..." | Sukant Ratnakar</title>
  <meta name="description" content="${escapedText} — Sukant Ratnakar">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${quoteUrl}">
  <meta property="og:title" content="Quote by Sukant Ratnakar">
  <meta property="og:description" content="${escapedText}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="1200">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${quoteUrl}">
  <meta name="twitter:title" content="Quote by Sukant Ratnakar">
  <meta name="twitter:description" content="${escapedText}">
  <meta name="twitter:image" content="${ogImageUrl}">
  
  <!-- LinkedIn -->
  <meta property="og:site_name" content="Sukant Ratnakar">
  <meta name="author" content="Sukant Ratnakar">
  
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="icon" type="image/png" href="/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0a0a0f;
      --bg-card: #1a1a24;
      --text-primary: #f5f5f7;
      --text-secondary: #a1a1aa;
      --accent: #6366f1;
      --border: rgba(255,255,255,0.1);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .nav {
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
    }
    .nav-logo {
      font-family: 'Playfair Display', serif;
      font-size: 1.4rem;
      font-weight: 600;
      color: var(--text-primary);
      text-decoration: none;
    }
    .nav-links { display: flex; gap: 24px; }
    .nav-links a { color: var(--text-secondary); text-decoration: none; font-size: 0.9rem; }
    .nav-links a:hover { color: var(--text-primary); }
    .breadcrumb {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 24px;
      text-align: center;
    }
    .breadcrumb a {
      color: var(--text-secondary);
      text-decoration: none;
    }
    .breadcrumb a:hover { color: var(--accent); }
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
    }
    .quote-card {
      background: linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.1) 100%);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 48px;
      max-width: 700px;
      text-align: center;
      position: relative;
    }
    .quote-card::before {
      content: '"';
      position: absolute;
      top: -10px;
      left: 30px;
      font-size: 150px;
      font-family: 'Playfair Display', serif;
      color: rgba(99, 102, 241, 0.1);
      line-height: 1;
    }
    .quote-category {
      display: inline-block;
      background: var(--accent);
      color: white;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
      margin-bottom: 24px;
      text-transform: capitalize;
    }
    .quote-text {
      font-family: 'Playfair Display', serif;
      font-size: 1.8rem;
      font-weight: 500;
      line-height: 1.5;
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }
    .quote-author {
      color: var(--text-secondary);
      font-size: 1rem;
      margin-bottom: 32px;
    }
    .quote-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
    }
    .quote-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    .quote-btn:hover {
      background: var(--bg-card);
      color: var(--text-primary);
      border-color: var(--accent);
    }
    .back-link {
      display: inline-block;
      margin-top: 32px;
      color: var(--accent);
      text-decoration: none;
      font-size: 0.9rem;
    }
    .back-link:hover { text-decoration: underline; }
    .footer {
      text-align: center;
      padding: 24px;
      color: var(--text-secondary);
      font-size: 0.85rem;
      border-top: 1px solid var(--border);
    }
    @media (max-width: 640px) {
      .quote-card { padding: 32px 24px; }
      .quote-text { font-size: 1.4rem; }
      .quote-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .quote-btn { justify-content: center; padding: 10px 12px; font-size: 0.8rem; }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <a href="/" class="nav-logo">SR</a>
    <div class="nav-links">
      <a href="/#about">About</a>
      <a href="/explore/">Explore</a>
      <a href="https://book.sukantratnakar.com" target="_blank">Calendar</a>
    </div>
  </nav>
  <main class="main">
    <div class="breadcrumb">
      <a href="/">Home</a> / <a href="/explore/">Explore</a> / <a href="/explore/quotes/">Quotes</a>
    </div>
    <div class="quote-card">
      <span class="quote-category">${quote.category || 'wisdom'}</span>
      <p class="quote-text">"${escapedText}"</p>
      <p class="quote-author">— Sukant Ratnakar</p>
      <div class="quote-actions">
        <a class="quote-btn" href="https://twitter.com/intent/tweet?text=${encodeURIComponent('"' + quote.text + '" — Sukant Ratnakar\n\n' + quoteUrl)}" target="_blank">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          X
        </a>
        <a class="quote-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(quoteUrl)}" target="_blank">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          LinkedIn
        </a>
        <a class="quote-btn" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(quoteUrl)}" target="_blank">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Facebook
        </a>
        <button class="quote-btn" onclick="downloadPoster()">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          Download
        </button>
      </div>
      <a href="/explore/quotes" class="back-link">← Back to All Quotes</a>
    </div>
  </main>
  <footer class="footer">
    <p>© 2026 Sukant Ratnakar</p>
  </footer>
  <script>
    function downloadPoster() {
      const imageUrl = '${ogImageUrl}';
      if (navigator.share && navigator.canShare) {
        fetch(imageUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'sukant-ratnakar-quote.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              navigator.share({
                files: [file],
                title: 'Quote by Sukant Ratnakar'
              }).catch(() => window.open(imageUrl, '_blank'));
            } else {
              window.open(imageUrl, '_blank');
            }
          })
          .catch(() => window.open(imageUrl, '_blank'));
      } else {
        const link = document.createElement('a');
        link.download = 'sukant-ratnakar-quote.png';
        link.href = imageUrl;
        link.click();
      }
    }
  </script>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}
