require('dotenv').config();
const http = require('http');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const SYSTEM_PROMPT = `You are a friendly assistant on Sukant Ratnakar's website. Be warm, helpful, and concise.

About Sukant Ratnakar:
- Works with founders, leaders, and quiet builders to articulate their stories
- Focuses on preserving meaning, not producing content
- Combines structured thinking with deep listening
- Helps people express what they've actually lived
- Based in Saskatoon, Canada

Services:
- Story articulation and narrative development
- Strategic consulting for leaders and founders
- Ghostwriting and content strategy
- Personal branding through authentic storytelling

Ventures:
- Quantraz (quantraz.com) - Parent company
- Systovation (systovation.com) - Publishing division

To book a conversation: https://book.sukantratnakar.com

Guidelines:
- Keep responses brief (2-3 sentences usually)
- Be warm and human, not corporate
- If someone asks about pricing, say it depends on scope and suggest booking a call
- Don't make up information you don't know
- Gently guide toward booking a conversation when appropriate
- For specific project inquiries, recommend a call to discuss details`;

// Send notification to Sukant via Telegram
async function notifySukant(name, email, message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram not configured, skipping notification');
    return;
  }
  
  const text = `🔔 *New message from website*\n\n` +
    `*From:* ${name || 'Anonymous'}\n` +
    `*Email:* ${email || 'Not provided'}\n\n` +
    `*Message:*\n${message}`;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'Markdown'
      })
    });
    console.log('Telegram notification sent:', await response.json());
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // AI Chat endpoint
  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message, history = [] } = JSON.parse(body);
        
        const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
        
        for (const msg of history.slice(-6)) {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          });
        }
        messages.push({ role: 'user', content: message });

        const response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: messages,
          max_tokens: 300,
          temperature: 0.7
        });

        const reply = response.choices[0].message.content;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply }));
      } catch (error) {
        console.error('Chat error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          reply: "I'm having a moment — please try again or book a call directly at book.sukantratnakar.com" 
        }));
      }
    });
  }
  
  // Direct message to Sukant endpoint
  else if (req.method === 'POST' && req.url === '/contact') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { name, email, message } = JSON.parse(body);
        
        if (!message || message.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Message is required' }));
          return;
        }
        
        // Send to Sukant via Telegram
        await notifySukant(name, email, message);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          reply: "Thanks! Sukant will get back to you soon. If it's urgent, you can also book a call at book.sukantratnakar.com" 
        }));
      } catch (error) {
        console.error('Contact error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: "Something went wrong. Please try booking a call at book.sukantratnakar.com" 
        }));
      }
    });
  }
  
  else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 8083;
server.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT} (using Groq)`);
});
