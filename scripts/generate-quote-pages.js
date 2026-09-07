#!/usr/bin/env node
/**
 * Generate individual quote HTML pages with OG meta tags for social sharing
 * Each quote gets its own page at /explore/quotes/quote-{id}.html
 */

const fs = require('fs');
const path = require('path');

const quotesPath = path.join(__dirname, '../app/data/quotes.json');
const outputDir = path.join(__dirname, '../app/explore/quotes');

const quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));

// HTML template for individual quote page
function generateQuotePage(quote) {
  const quoteText = quote.text;
  const truncatedText = quoteText.length > 200 ? quoteText.substring(0, 197) + '...' : quoteText;
  const quoteId = quote.id.replace('quote-', '');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>"${truncatedText}" — Sukant Ratnakar</title>
  
  <!-- Open Graph for LinkedIn, Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${quoteText.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="— Sukant Ratnakar">
  <meta property="og:url" content="https://sukantratnakar.com/explore/quotes/quote-${quoteId}">
  <meta property="og:image" content="https://sukantratnakar.com/explore/quotes/posters/quote-${quoteId}.jpg">
  <meta property="og:image:width" content="1080">
  <meta property="og:image:height" content="1080">
  <meta property="og:site_name" content="Sukant Ratnakar">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${truncatedText.replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="— Sukant Ratnakar">
  <meta name="twitter:image" content="https://sukantratnakar.com/explore/quotes/posters/quote-${quoteId}.jpg">
  
  <!-- Redirect to main quotes page with this quote highlighted -->
  <meta http-equiv="refresh" content="0; url=/explore/quotes/#quote-${quoteId}">
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0f;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .quote-card {
      max-width: 600px;
      text-align: center;
      padding: 40px;
      background: linear-gradient(145deg, rgba(99,102,241,0.1), rgba(99,102,241,0.05));
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .quote-text {
      font-size: 1.5rem;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .quote-author {
      color: rgba(255,255,255,0.7);
    }
    a {
      color: #6366f1;
    }
  </style>
</head>
<body>
  <div class="quote-card">
    <p class="quote-text">"${quoteText}"</p>
    <p class="quote-author">— ${quote.author}</p>
    <p><small>Redirecting to <a href="/explore/quotes/#quote-${quoteId}">quotes page</a>...</small></p>
  </div>
</body>
</html>`;
}

// Generate all quote pages
let generated = 0;
quotes.forEach((quote, index) => {
  const quoteId = quote.id.replace('quote-', '');
  const filename = `quote-${quoteId}.html`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, generateQuotePage(quote));
  generated++;
});

console.log(`✅ Generated ${generated} quote pages in ${outputDir}`);
