#!/usr/bin/env node
/**
 * Generate square poster images for quotes (1080x1080)
 * For use as OG images on social media
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const quotesPath = path.join(__dirname, '../app/data/quotes.json');
const outputDir = path.join(__dirname, '../app/explore/quotes/posters');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const quotes = JSON.parse(fs.readFileSync(quotesPath, 'utf8'));

// Canvas settings
const WIDTH = 1080;
const HEIGHT = 1080;

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}

function generatePoster(quote) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Background gradient (dark purple/blue)
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(0.5, '#16213e');
  gradient.addColorStop(1, '#0f0f23');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle decorative elements
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 200);
  ctx.lineTo(80, 280);
  ctx.stroke();

  // Quote text
  const quoteText = `"${quote.text}"`;
  
  // Dynamic font size based on text length
  let fontSize = 48;
  if (quoteText.length > 200) fontSize = 36;
  else if (quoteText.length > 150) fontSize = 40;
  else if (quoteText.length > 100) fontSize = 44;

  ctx.font = `${fontSize}px Georgia, serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxWidth = WIDTH - 160;
  const lines = wrapText(ctx, quoteText, maxWidth);
  const lineHeight = fontSize * 1.4;
  const totalTextHeight = lines.length * lineHeight;
  let startY = (HEIGHT - totalTextHeight) / 2 - 40;

  lines.forEach((line, i) => {
    ctx.fillText(line, WIDTH / 2, startY + (i * lineHeight));
  });

  // Author
  ctx.font = '32px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  const authorY = startY + totalTextHeight + 60;
  ctx.fillText(`— ${quote.author}`, WIDTH / 2, authorY);

  // Website URL at bottom
  ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('sukantratnakar.com', WIDTH / 2, HEIGHT - 60);

  return canvas.toBuffer('image/jpeg', { quality: 0.9 });
}

// Generate all posters
let generated = 0;
let skipped = 0;

quotes.forEach((quote, index) => {
  const quoteId = quote.id.replace('quote-', '');
  const filename = `quote-${quoteId}.jpg`;
  const filepath = path.join(outputDir, filename);
  
  // Skip if already exists (for incremental generation)
  if (fs.existsSync(filepath)) {
    skipped++;
    return;
  }

  const buffer = generatePoster(quote);
  fs.writeFileSync(filepath, buffer);
  generated++;
  
  if (generated % 50 === 0) {
    console.log(`Generated ${generated} posters...`);
  }
});

console.log(`✅ Generated ${generated} posters, skipped ${skipped} existing`);
