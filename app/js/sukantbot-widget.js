/**
 * San - Chat Widget for sukantratnakar.com
 * Real-time WebSocket chat with live takeover support
 */

(function() {
  const BOT_URL = 'https://bot.sukantratnakar.com';
  const WS_URL = BOT_URL.replace('https://', 'wss://').replace('http://', 'ws://');
  
  let ws = null;
  let sessionId = null;
  let reconnectAttempts = 0;
  const maxReconnect = 3;
  
  // Styles
  const styles = `
    #san-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    #san-toggle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
    }
    
    #san-toggle:hover {
      transform: scale(1.1);
    }
    
    #san-toggle svg {
      width: 28px;
      height: 28px;
      fill: white;
    }
    
    #san-chat {
      display: none;
      position: absolute;
      bottom: 70px;
      right: 0;
      width: 350px;
      height: 480px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      flex-direction: column;
    }
    
    #san-chat.open {
      display: flex;
    }
    
    #san-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    #san-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    #san-status {
      font-size: 11px;
      opacity: 0.9;
      margin-top: 2px;
    }
    
    #san-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 20px;
      padding: 0;
      line-height: 1;
    }
    
    #san-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .san-message {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
    }
    
    .san-message.bot {
      background: #f0f0f0;
      color: #1a1a1a;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    
    .san-message.operator {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      color: white;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    
    .san-message.user {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    
    .san-message .sender {
      font-size: 11px;
      opacity: 0.7;
      margin-bottom: 4px;
      display: block;
    }
    
    .san-message.typing {
      background: #f0f0f0;
      align-self: flex-start;
    }
    
    .san-typing-dots {
      display: flex;
      gap: 4px;
    }
    
    .san-typing-dots span {
      width: 8px;
      height: 8px;
      background: #999;
      border-radius: 50%;
      animation: san-bounce 1.4s infinite ease-in-out both;
    }
    
    .san-typing-dots span:nth-child(1) { animation-delay: -0.32s; }
    .san-typing-dots span:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes san-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    
    .san-system {
      text-align: center;
      font-size: 12px;
      color: #666;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 8px;
      align-self: center;
    }
    
    #san-input-area {
      padding: 12px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
    }
    
    #san-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #ddd;
      border-radius: 20px;
      font-size: 14px;
      outline: none;
    }
    
    #san-input:focus {
      border-color: #667eea;
    }
    
    #san-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    #san-send svg {
      width: 18px;
      height: 18px;
      fill: white;
    }
    
    #san-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .san-action-btn {
      display: inline-block;
      padding: 8px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 18px;
      font-size: 13px;
      font-weight: 500;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      white-space: nowrap;
    }
    
    .san-action-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .san-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
  `;
  
  // HTML template
  const template = `
    <div id="san-widget">
      <div id="san-chat">
        <div id="san-header">
          <div>
            <h3>💬 Chat with San</h3>
            <div id="san-status">Sukant's assistant</div>
          </div>
          <button id="san-close">&times;</button>
        </div>
        <div id="san-messages"></div>
        <div id="san-input-area">
          <input type="text" id="san-input" placeholder="Type a message..." />
          <button id="san-send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
      <button id="san-toggle">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
      </button>
    </div>
  `;
  
  // Inject styles and HTML
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
  
  const container = document.createElement('div');
  container.innerHTML = template;
  document.body.appendChild(container.firstElementChild);
  
  // Elements
  const chat = document.getElementById('san-chat');
  const toggle = document.getElementById('san-toggle');
  const close = document.getElementById('san-close');
  const messages = document.getElementById('san-messages');
  const input = document.getElementById('san-input');
  const send = document.getElementById('san-send');
  const status = document.getElementById('san-status');
  
  // Visitor ID management
  function getVisitorId() {
    let visitorId = localStorage.getItem('san_visitor_id');
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substr(2, 12);
      localStorage.setItem('san_visitor_id', visitorId);
    }
    return visitorId;
  }
  
  const visitorId = getVisitorId();
  
  // WebSocket connection
  function connect() {
    try {
      ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('[San] Connected');
        reconnectAttempts = 0;
        status.textContent = "Sukant's assistant";
        
        // Send init message with visitor ID and current page
        ws.send(JSON.stringify({
          type: 'init',
          visitorId: visitorId,
          page: window.location.pathname
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (e) {
          console.error('[San] Parse error:', e);
        }
      };
      
      ws.onclose = () => {
        console.log('[San] Disconnected');
        if (reconnectAttempts < maxReconnect) {
          reconnectAttempts++;
          setTimeout(connect, 2000 * reconnectAttempts);
        }
      };
      
      ws.onerror = (err) => {
        console.error('[San] WebSocket error, falling back to HTTP');
      };
      
    } catch (e) {
      console.error('[San] Connection failed:', e);
    }
  }
  
  function handleMessage(data) {
    switch (data.type) {
      case 'connected':
        sessionId = data.sessionId;
        if (data.visitorName) {
          status.textContent = `Hi ${data.visitorName}! 👋`;
        } else if (data.isReturning) {
          status.textContent = "Welcome back! 👋";
        }
        if (data.greeting) {
          addMessage(data.greeting, 'bot', [], 'San');
        }
        break;
      
      case 'typing':
        if (data.isTyping) {
          showTyping();
        } else {
          hideTyping();
        }
        break;
        
      case 'message':
        hideTyping();
        const msgClass = data.fromOperator ? 'operator' : 'bot';
        const sender = data.sender || (data.fromOperator ? 'Sukant' : 'San');
        addMessage(data.response, msgClass, data.buttons || [], sender);
        break;
        
      case 'operator_joined':
        hideTyping();
        status.textContent = "Sukant is here! ✨";
        addSystemMessage(data.message);
        break;
        
      case 'operator_left':
        hideTyping();
        status.textContent = "Sukant's assistant";
        addSystemMessage(data.message);
        break;
    }
  }
  
  function addMessage(text, type = 'bot', buttons = [], sender = null) {
    const msg = document.createElement('div');
    msg.className = `san-message ${type}`;
    
    if (sender && type !== 'user') {
      const senderEl = document.createElement('span');
      senderEl.className = 'sender';
      senderEl.textContent = sender;
      msg.appendChild(senderEl);
    }
    
    const textEl = document.createElement('span');
    textEl.textContent = text;
    msg.appendChild(textEl);
    
    if (buttons && buttons.length > 0 && type !== 'user') {
      const btnContainer = document.createElement('div');
      btnContainer.className = 'san-buttons';
      
      buttons.forEach(btn => {
        if (btn && btn.link) {
          const a = document.createElement('a');
          a.className = 'san-action-btn';
          a.href = btn.link;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = btn.text;
          btnContainer.appendChild(a);
        }
      });
      
      msg.appendChild(btnContainer);
    }
    
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }
  
  function addSystemMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'san-system';
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }
  
  function showTyping() {
    if (document.getElementById('san-typing')) return;
    const typing = document.createElement('div');
    typing.className = 'san-message typing';
    typing.id = 'san-typing';
    typing.innerHTML = '<div class="san-typing-dots"><span></span><span></span><span></span></div>';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
  }
  
  function hideTyping() {
    const typing = document.getElementById('san-typing');
    if (typing) typing.remove();
  }
  
  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    send.disabled = true;
    
    addMessage(text, 'user');
    showTyping();
    
    // Try WebSocket first
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ message: text }));
    } else {
      // Fallback to HTTP
      try {
        const response = await fetch(`${BOT_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, sessionId })
        });
        
        const data = await response.json();
        hideTyping();
        addMessage(data.response || 'Sorry, I had trouble with that.', 'bot', data.buttons || [], 'San');
      } catch (err) {
        hideTyping();
        addMessage("Sorry, I'm having trouble connecting. Please try again or email sukant@quantraz.com", 'bot');
      }
    }
    
    send.disabled = false;
    input.focus();
  }
  
  // Event listeners
  toggle.addEventListener('click', () => {
    chat.classList.toggle('open');
    if (chat.classList.contains('open')) {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        connect();
      }
      input.focus();
    }
  });
  
  close.addEventListener('click', () => {
    chat.classList.remove('open');
  });
  
  send.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  
  // Pre-connect when page loads (optional, saves time when user opens chat)
  // connect();
  
})();
