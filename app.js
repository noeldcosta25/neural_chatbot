/* ═══════════════════════════════════════════════════════════
   app.js — NeuralChat ULTRA
   Groq-powered · Streaming · Multi-chat · Themes
═══════════════════════════════════════════════════════════ */

/* ─── Config ──────────────────────────────────────────────── */
const CFG = {
  model:      'llama-3.3-70b-versatile',
  apiUrl:     'https://api.groq.com/openai/v1/chat/completions',
  maxTokens:  1200,
  temp:       0.7,
  memWindow:  12,
  contTokens: 800,
  sysPrompt:  'You are a helpful AI assistant.',
  storageKey: 'nc_groq_key',
  chatsKey:   'nc_chats_v1',
  themeKey:   'nc_theme',
};

/* ─── Model display labels ────────────────────────────────── */
const MODEL_META = {
  'llama-3.3-70b-versatile': { name: 'Llama 3.3 70B', sub: 'via Groq · Versatile' },
  'llama-3.1-8b-instant':    { name: 'Llama 3.1 8B',  sub: 'via Groq · Instant'   },
  'openai/gpt-oss-120b':     { name: 'GPT OSS 120B',  sub: 'via Groq · OpenAI'    },
  'openai/gpt-oss-20b':      { name: 'GPT OSS 20B',   sub: 'via Groq · OpenAI'    },
  'qwen/qwen3-32b':          { name: 'Qwen3 32B',     sub: 'via Groq · Alibaba'   },
};

/* ─── Prompt pool — shuffled each load ───────────────────── */
const PROMPT_POOL = [
  { icon: '⚛', label: 'Explain quantum computing', prompt: 'Explain quantum computing in simple terms' },
  { icon: '⌨', label: 'Write a Python function',   prompt: 'Write a Python function to sort a list' },
  { icon: '📡', label: 'AI trends',                 prompt: 'What are the biggest AI trends right now?' },
  { icon: '🧠', label: 'Process intelligence',      prompt: 'What is process intelligence and how is it used in business?' },
  { icon: '💡', label: 'Brainstorm app ideas',      prompt: 'Help me brainstorm ideas for a mobile app' },
  { icon: '🔌', label: 'REST vs GraphQL',           prompt: 'Explain REST vs GraphQL differences' },
  { icon: '✍',  label: 'Write a haiku',             prompt: 'Write a haiku about artificial intelligence' },
  { icon: '🔒', label: 'Explain zero-trust security', prompt: 'Explain zero-trust security architecture' },
  { icon: '🚀', label: 'Space tech advances',       prompt: 'What are the latest advances in space technology?' },
  { icon: '📊', label: 'Explain machine learning',  prompt: 'Explain machine learning to a 10-year-old' },
  { icon: '🌐', label: 'Web3 explained',            prompt: 'Explain Web3 and decentralized apps simply' },
  { icon: '🤖', label: 'Future of AI agents',       prompt: 'What is the future of autonomous AI agents?' },
  { icon: '🧬', label: 'AI in healthcare',          prompt: 'How is AI transforming healthcare and medicine?' },
  { icon: '📦', label: 'Docker vs Kubernetes',      prompt: 'What is the difference between Docker and Kubernetes?' },
  { icon: '💬', label: 'Improve my writing',        prompt: 'Give me tips to improve my technical writing' },
  { icon: '🔮', label: 'Explain neural networks',   prompt: 'How do neural networks learn from data?' },
  { icon: '⚡', label: 'Edge computing basics',     prompt: 'What is edge computing and why does it matter?' },
  { icon: '📱', label: 'React Native vs Flutter',   prompt: 'Compare React Native and Flutter for mobile development' },
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── State ───────────────────────────────────────────────── */
let messages        = [];
let history         = [{ role: 'system', content: CFG.sysPrompt }];
let streaming       = false;
let abortController = null;
let _autoScroll     = true;
let _stopped        = false;   // kills typewriter immediately on stop

/* ─── Multi-chat state ────────────────────────────────────── */
let chats       = {};
let activeChat  = null;
let _pendingDeleteId = null;   // id waiting for delete confirmation

/* ─── DOM refs ────────────────────────────────────────────── */
const $  = id => document.getElementById(id);
const el = {
  app:              () => $('app'),
  sidebar:          () => $('sidebar'),
  overlay:          () => $('overlay'),
  menuBtn:          () => $('menu-btn'),
  topbar:           () => $('topbar'),
  statusPill:       () => $('status-pill'),
  topbarTok:        () => $('topbar-tokens'),
  topbarModel:      () => $('topbar-model'),
  messages:         () => $('messages'),
  emptyState:       () => $('empty-state'),
  scrollBtn:        () => $('scroll-btn'),
  errorBar:         () => $('error-bar'),
  inputArea:        () => $('input-area'),
  inputShell:       () => $('input-shell'),
  chatInput:        () => $('chat-input'),
  sendBtn:          () => $('send-btn'),
  stopBtn:          () => $('stop-btn'),
  charCount:        () => $('char-count'),
  sMsgs:            () => $('s-msgs'),
  sCtx:             () => $('s-ctx'),
  sTokens:          () => $('s-tokens'),
  resetBtn:         () => $('reset-btn'),
  changeKeyBtn:     () => $('change-key-btn'),
  topbarKeyBtn:     () => $('topbar-key-btn'),
  modalBack:        () => $('modal-backdrop'),
  apiKeyInput:      () => $('api-key-input'),
  eyeBtn:           () => $('eye-btn'),
  eyeShow:          () => $('eye-show'),
  eyeHide:          () => $('eye-hide'),
  modalSave:        () => $('modal-save'),
  toasts:           () => $('toast-container'),
  modelDropdown:    () => $('model-dropdown'),
  modelTrigger:     () => $('model-trigger'),
  modelTriggerLabel:() => $('model-trigger-label'),
  modelOptions:     () => $('model-options'),
  newChatBtn:       () => $('new-chat-btn'),
  chatList:         () => $('chat-list'),
  sbModelName:      () => $('sb-model-name'),
  sbModelSub:       () => $('sb-model-sub'),
  inputNote:        () => $('input-note'),
  themeBtn:         () => $('theme-btn'),
  themeIconDark:    () => $('theme-icon-dark'),
  themeIconLight:   () => $('theme-icon-light'),
  themeLabel:       () => $('theme-label'),
  sbPromptsContainer:() => $('sb-prompts-container'),
  deleteBackdrop:   () => $('delete-confirm-backdrop'),
  deleteYes:        () => $('delete-confirm-yes'),
  deleteNo:         () => $('delete-confirm-no'),
};

/* ═══════════════════════════════════════════════════════════
   ANIMATED BACKGROUND CANVAS
═══════════════════════════════════════════════════════════ */
function initCanvas() {
  const canvas = $('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H;
  const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);

  const orbs = [
    { x:0.15, y:0.2,  r:0.32, color:[167,139,250], speed:0.00018, phase:0   },
    { x:0.80, y:0.75, r:0.28, color:[244,114,182], speed:0.00022, phase:2.1 },
    { x:0.5,  y:0.5,  r:0.22, color:[34,211,238],  speed:0.00015, phase:4.2 },
    { x:0.85, y:0.2,  r:0.18, color:[249,115,22],  speed:0.0002,  phase:1.0 },
    { x:0.1,  y:0.8,  r:0.20, color:[74,222,128],  speed:0.00017, phase:3.3 },
  ];
  const parts = Array.from({length:55}, () => ({
    x:Math.random(), y:Math.random(),
    vx:(Math.random()-0.5)*0.00012, vy:(Math.random()-0.5)*0.00012,
    r:Math.random()*1.5+0.4, alpha:Math.random()*0.4+0.1,
    color:[[167,139,250],[244,114,182],[34,211,238],[249,115,22]][Math.floor(Math.random()*4)],
  }));

  let t = 0;
  function draw(ts) {
    t = ts; ctx.clearRect(0,0,W,H);
    orbs.forEach(o => {
      const ox=(o.x+Math.sin(t*o.speed+o.phase)*0.08)*W, oy=(o.y+Math.cos(t*o.speed*0.7+o.phase)*0.06)*H;
      const g=ctx.createRadialGradient(ox,oy,0,ox,oy,o.r*Math.min(W,H));
      g.addColorStop(0,`rgba(${o.color},0.14)`); g.addColorStop(0.5,`rgba(${o.color},0.05)`); g.addColorStop(1,`rgba(${o.color},0)`);
      ctx.beginPath(); ctx.fillStyle=g; ctx.arc(ox,oy,o.r*Math.min(W,H),0,Math.PI*2); ctx.fill();
    });
    parts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=1; if(p.x>1)p.x=0; if(p.y<0)p.y=1; if(p.y>1)p.y=0;
      const alpha=p.alpha*(0.6+0.4*Math.sin(t*0.001+p.r*10));
      ctx.beginPath(); ctx.arc(p.x*W,p.y*H,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(${p.color},${alpha})`; ctx.fill();
    });
    ctx.strokeStyle='rgba(167,139,250,0.025)'; ctx.lineWidth=1;
    for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

/* ═══════════════════════════════════════════════════════════
   MARKDOWN RENDERER
═══════════════════════════════════════════════════════════ */
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderMd(raw) {
  let s = raw;
  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_,lang,code) => {
    const langLabel = lang ? esc(lang) : 'code';
    const id = 'cb-' + Math.random().toString(36).slice(2,8);
    return `<pre><div class="code-header"><span class="code-lang">${langLabel}</span>`
      + `<button class="copy-code-btn" data-target="${id}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button></div>`
      + `<code id="${id}">${esc(code.trim())}</code></pre>`;
  });
  const parts = s.split(/(<pre>[\s\S]*?<\/pre>)/g);
  s = parts.map((part,i) => {
    if(i%2===1) return part;
    let p = esc(part);
    p = p.replace(/`([^`\n]+)`/g,'<code>$1</code>');
    p = p.replace(/\*\*([\s\S]*?)\*\*/g,'<strong>$1</strong>');
    p = p.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,'<em>$1</em>');
    p = p.replace(/(^|\n)### (.+)/g,'$1<h3>$2</h3>');
    p = p.replace(/(^|\n)## (.+)/g,'$1<h2>$2</h2>');
    p = p.replace(/(^|\n)# (.+)/g,'$1<h1>$2</h1>');
    p = p.replace(/(^|\n)&gt; (.+)/g,'$1<blockquote>$2</blockquote>');
    p = p.replace(/(^|\n)---\n/g,'$1<hr>');
    p = p.replace(/(^|\n)[-*] (.+)/g,'$1<li>$2</li>');
    p = p.replace(/(<li>[\s\S]*?<\/li>(\n|$))+/g,m=>`<ul>${m}</ul>`);
    p = p.replace(/(^|\n)\d+\. (.+)/g,'$1<li>$2</li>');
    p = p.replace(/\n\n+/g,'</p><p>');
    p = p.replace(/\n/g,'<br>');
    return p;
  }).join('');
  return s;
}

/* ═══════════════════════════════════════════════════════════
   API KEY
═══════════════════════════════════════════════════════════ */
const getKey  = () => localStorage.getItem(CFG.storageKey) || '';
const saveKey = k  => localStorage.setItem(CFG.storageKey, k.trim());

/* ═══════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════ */
let _isLight = false;

function initTheme() {
  _isLight = localStorage.getItem(CFG.themeKey) === 'light';
  applyTheme(false);
}

function applyTheme(animate = true) {
  if (!animate) document.body.style.transition = 'none';
  document.body.classList.toggle('light', _isLight);
  if (!animate) { void document.body.offsetWidth; document.body.style.transition = ''; }
  const iconDark = el.themeIconDark(), iconLight = el.themeIconLight(), label = el.themeLabel();
  if (!iconDark || !iconLight || !label) return;
  if (_isLight) { iconDark.style.display='none'; iconLight.style.display=''; label.textContent='Dark'; }
  else          { iconDark.style.display='';     iconLight.style.display='none'; label.textContent='Light'; }
}

function toggleTheme() {
  _isLight = !_isLight;
  localStorage.setItem(CFG.themeKey, _isLight ? 'light' : 'dark');
  applyTheme(true);
}

/* ═══════════════════════════════════════════════════════════
   QUICK PROMPTS — random shuffle each load
═══════════════════════════════════════════════════════════ */
const _sessionPrompts = shuffleArray(PROMPT_POOL); // fixed for this page load

function renderSidebarPrompts() {
  const container = el.sbPromptsContainer();
  if (!container) return;
  container.innerHTML = '';
  _sessionPrompts.slice(0, 6).forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'sb-prompt';
    btn.dataset.p = p.prompt;
    btn.innerHTML = `<span class="sb-prompt-icon">${p.icon}</span> ${esc(p.label)}`;
    btn.addEventListener('click', () => { firePrompt(p.prompt); closeSidebar(); });
    container.appendChild(btn);
  });
}

/* ═══════════════════════════════════════════════════════════
   MODEL DROPDOWN
═══════════════════════════════════════════════════════════ */
let _activeModel = CFG.model;

function getActiveModel() { return _activeModel; }

function setActiveModel(modelId, skipSave) {
  _activeModel = modelId;
  const meta = MODEL_META[modelId] || { name: modelId, sub: 'via Groq' };
  const label = el.modelTriggerLabel();
  if (label) label.textContent = meta.name;
  const opts = el.modelOptions();
  if (opts) opts.querySelectorAll('.model-option').forEach(o => o.classList.toggle('active', o.dataset.value === modelId));
  updateModelDisplay(modelId);
  if (!skipSave && activeChat && chats[activeChat]) {
    chats[activeChat].model = modelId;
    saveChatsToStorage();
  }
}

function openModelDropdown() {
  const dd = el.modelDropdown();
  if (!dd || dd.classList.contains('disabled')) return;
  dd.classList.add('open');
  el.modelTrigger().setAttribute('aria-expanded','true');
}
function closeModelDropdown() {
  const dd = el.modelDropdown();
  if (!dd) return;
  dd.classList.remove('open');
  el.modelTrigger().setAttribute('aria-expanded','false');
}
function toggleModelDropdown() {
  const dd = el.modelDropdown();
  if (!dd) return;
  dd.classList.contains('open') ? closeModelDropdown() : openModelDropdown();
}

function updateModelDisplay(modelId) {
  const meta = MODEL_META[modelId] || { name: modelId, sub: 'via Groq' };
  const tb = el.topbarModel(); if (tb) tb.textContent = meta.name;
  const sbName = el.sbModelName(); if (sbName) sbName.textContent = meta.name;
  const sbSub  = el.sbModelSub();  if (sbSub)  sbSub.textContent  = meta.sub;
  const note   = el.inputNote();   if (note)   note.textContent   = meta.name + ' via Groq';
}

/* ═══════════════════════════════════════════════════════════
   MULTI-CHAT: localStorage
═══════════════════════════════════════════════════════════ */
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function loadChatsFromStorage() {
  try {
    const raw = localStorage.getItem(CFG.chatsKey);
    if (raw) { const d = JSON.parse(raw); chats = d.chats || {}; activeChat = d.activeChat || null; }
  } catch(e) { chats = {}; activeChat = null; }
}

function saveChatsToStorage() {
  try {
    if (activeChat && chats[activeChat]) {
      chats[activeChat].messages = messages;
      chats[activeChat].history  = history;
      chats[activeChat].model    = getActiveModel();
    }
    localStorage.setItem(CFG.chatsKey, JSON.stringify({ chats, activeChat }));
  } catch(e) {}
}

/* ═══════════════════════════════════════════════════════════
   MULTI-CHAT: Create / Switch / Delete
═══════════════════════════════════════════════════════════ */
function createNewChat() {
  if (streaming) return;

  // 1. Flush current chat's in-memory state into its store entry
  if (activeChat && chats[activeChat]) {
    chats[activeChat].messages = [...messages];
    chats[activeChat].history  = [...history];
    chats[activeChat].model    = getActiveModel();
  }

  // 2. Reset in-memory state to blank BEFORE switching activeChat
  messages = [];
  history  = [{ role: 'system', content: CFG.sysPrompt }];

  // 3. Create the new chat entry with clean state
  const id = genId();
  chats[id] = {
    id,
    title:    'New Chat',
    messages: [],
    history:  [{ role: 'system', content: CFG.sysPrompt }],
    model:    getActiveModel(),
    titled:   false,
  };

  // 4. Switch active and persist (saveChatsToStorage now writes [] into new chat — correct)
  activeChat = id;
  saveChatsToStorage();
  renderChatList();
  applyChatToUI(id);
  toast('New chat created', 'info', 1800);
  closeSidebar();
  el.chatInput().focus();
}

function switchToChat(id) {
  if (id === activeChat || streaming) return;

  // Flush current chat's state with deep copies
  if (activeChat && chats[activeChat]) {
    chats[activeChat].messages = [...messages];
    chats[activeChat].history  = [...history];
    chats[activeChat].model    = getActiveModel();
  }

  // Reset in-memory state before loading new chat
  messages = [];
  history  = [{ role: 'system', content: CFG.sysPrompt }];

  activeChat = id;
  saveChatsToStorage();
  renderChatList();
  applyChatToUI(id);
}

/* ─── Delete with confirmation ──────────────────────────── */
function promptDeleteChat(id) {
  _pendingDeleteId = id;
  const backdrop = el.deleteBackdrop();
  if (backdrop) backdrop.classList.remove('hidden');
}

function hideDeleteConfirm() {
  _pendingDeleteId = null;
  const backdrop = el.deleteBackdrop();
  if (backdrop) backdrop.classList.add('hidden');
}

function confirmDeleteChat() {
  const id = _pendingDeleteId;
  hideDeleteConfirm();
  if (!id) return;

  const keys = Object.keys(chats);
  if (keys.length <= 1) { resetChat(); return; }
  delete chats[id];
  if (activeChat === id) {
    const remaining = Object.keys(chats).sort((a,b) => b.localeCompare(a));
    activeChat = remaining[0];
    applyChatToUI(activeChat);
  }
  saveChatsToStorage();
  renderChatList();
  toast('Chat deleted', 'info', 1600);
}

/* ─── Apply chat to UI ───────────────────────────────────── */
function applyChatToUI(id) {
  const chat = chats[id];
  if (!chat) return;

  // Deep-copy so in-memory arrays never share references with the store
  messages = chat.messages ? chat.messages.map(m => ({...m})) : [];
  history  = chat.history  ? chat.history.map(m => ({...m}))  : [{ role:'system', content:CFG.sysPrompt }];

  setActiveModel(chat.model || CFG.model, true);

  const c = el.messages();
  if (messages.length === 0) {
    c.innerHTML = buildEmptyStateHTML();
    c.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => firePrompt(ch.dataset.p)));
  } else {
    c.innerHTML = '';
    messages.forEach(m => appendStaticMessage(m.role === 'assistant' ? 'bot' : m.role, m.content, m.time || ''));
    scrollBottom(false);
  }
  setStatus('ready');
  el.errorBar().classList.remove('show');
  updateStats();
}

/* ─── Render chat list ───────────────────────────────────── */
function renderChatList() {
  const list = el.chatList();
  if (!list) return;
  list.innerHTML = '';
  Object.values(chats).sort((a,b) => b.id.localeCompare(a.id)).forEach(chat => {
    const item = document.createElement('div');
    item.className = 'chat-item' + (chat.id === activeChat ? ' active' : '');
    item.dataset.id = chat.id;
    item.innerHTML = `
      <span class="chat-item-icon">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </span>
      <span class="chat-item-title">${esc(chat.title)}</span>
      <button class="chat-item-del" data-id="${chat.id}" title="Delete chat">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    item.addEventListener('click', e => {
      if (e.target.closest('.chat-item-del')) return;
      switchToChat(chat.id); closeSidebar();
    });
    item.querySelector('.chat-item-del').addEventListener('click', e => {
      e.stopPropagation(); promptDeleteChat(chat.id);
    });
    list.appendChild(item);
  });
}

/* ─── AI-generated chat title ────────────────────────────── */
async function generateChatTitle(chatId) {
  if (!chats[chatId] || chats[chatId].titled) return;
  chats[chatId].titled = true;
  const key = getKey();
  if (!key) return;
  const chatMsgs = chats[chatId].messages || [];
  const firstUser = chatMsgs.find(m => m.role === 'user')?.content || '';
  const firstBot  = chatMsgs.find(m => m.role === 'assistant')?.content || '';
  if (!firstUser) return;
  try {
    const resp = await fetch(CFG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer ' + key },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 16, temperature: 0.4,
        messages: [
          { role:'system', content:'You generate ultra-short chat titles. Reply with ONLY the title — 3 to 5 words max, no quotes, no punctuation at the end, no explanation.' },
          { role:'user',   content:`User asked: "${firstUser.slice(0,200)}"\nAssistant replied: "${firstBot.slice(0,200)}"\n\nWrite a 3-5 word title for this conversation.` },
        ],
      }),
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const title = (data.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g,'').replace(/\.$/,'').slice(0,40);
    if (title && chats[chatId]) { chats[chatId].title = title; saveChatsToStorage(); renderChatList(); }
  } catch(_) {}
}

/* ═══════════════════════════════════════════════════════════
   EMPTY STATE HTML
═══════════════════════════════════════════════════════════ */
function buildEmptyStateHTML() {
  // Pick 4 chips from the same shuffled session pool
  const chips = _sessionPrompts.slice(0, 4);
  const chipsHTML = chips.map(p =>
    `<button class="chip" data-p="${esc(p.prompt)}">${p.icon} ${esc(p.label)}</button>`
  ).join('');
  return `
    <div id="empty-state">
      <div class="empty-glow-ring">
        <div class="empty-ring">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.5 2 3 6.5 3 11c0 2.8 1.2 5.2 3 6.8L7.5 22h9l1.5-4.2C20 16.2 21 13.8 21 11c0-4.5-3.5-9-9-9z" fill="url(#lg2r)" opacity="0.95"/>
            <circle cx="9" cy="11" r="1.8" fill="white" opacity="0.9"/>
            <circle cx="15" cy="11" r="1.8" fill="white" opacity="0.9"/>
            <defs><linearGradient id="lg2r" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs>
          </svg>
        </div>
      </div>
      <h1 class="empty-title">How can I help you?</h1>
      <p class="empty-sub">Powered by Groq · Streaming · Memory</p>
      <div class="empty-chips">${chipsHTML}</div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   STATS
═══════════════════════════════════════════════════════════ */
function updateStats() {
  const tok = Math.round(JSON.stringify(history).length / 4);
  const ctx = history.length - 1;
  const animate = (el, val) => {
    el.textContent = val; el.style.animation = 'none';
    void el.offsetWidth; el.style.animation = 'statPop 0.35s ease';
  };
  animate(el.sMsgs(), messages.length);
  animate(el.sCtx(),  ctx);
  el.sTokens().textContent   = '~' + tok.toLocaleString();
  el.topbarTok().textContent = '~' + tok.toLocaleString() + ' tokens';
}

/* ═══════════════════════════════════════════════════════════
   STATUS
═══════════════════════════════════════════════════════════ */
function setStatus(s) {
  const labels = { ready:'● ready', thinking:'◌ thinking…', streaming:'◉ streaming' };
  const pill = el.statusPill();
  pill.textContent = labels[s] || s;
  pill.dataset.s   = s;
}

/* ═══════════════════════════════════════════════════════════
   ERROR BAR
═══════════════════════════════════════════════════════════ */
let errTimer;
function showError(msg, ms=7000) {
  const bar = el.errorBar();
  bar.textContent = '⚠ ' + msg;
  bar.classList.add('show');
  clearTimeout(errTimer);
  errTimer = setTimeout(() => bar.classList.remove('show'), ms);
}

/* ═══════════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════════ */
function toast(msg, type='info', ms=3000) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<div class="toast-dot"></div><span>${esc(msg)}</span>`;
  el.toasts().appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, ms);
}

/* ═══════════════════════════════════════════════════════════
   SCROLL HELPERS
   _autoScroll:         true = follow stream, false = user scrolled away
   _programmaticScroll: true = JS did this scroll, ignore the event
═══════════════════════════════════════════════════════════ */
let _programmaticScroll = false;

/* Instant scroll — used during streaming typewriter (no animation = one scroll event, rAF clears guard before next tick) */
function scrollInstant() {
  const c = el.messages();
  _programmaticScroll = true;
  c.scrollTop = c.scrollHeight;
  requestAnimationFrame(() => { _programmaticScroll = false; });
}

/* Smooth scroll — used for button clicks and load */
function scrollBottom(smooth = true) {
  const c = el.messages();
  _programmaticScroll = true;
  if (smooth) {
    c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
    // Smooth scroll fires events for ~300ms; clear guard after it settles
    setTimeout(() => { _programmaticScroll = false; }, 400);
  } else {
    c.scrollTop = c.scrollHeight;
    requestAnimationFrame(() => { _programmaticScroll = false; });
  }
}

function updateScrollBtn() {
  const c = el.messages();
  const atBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 80;
  el.scrollBtn().classList.toggle('hidden', atBottom);

  if (_programmaticScroll) return;   // ignore JS-initiated scroll events
  if (atBottom) {
    _autoScroll = true;
  } else if (streaming) {
    _autoScroll = false;             // user scrolled up during generation
  }
}

/* ═══════════════════════════════════════════════════════════
   HISTORY TRIMMER
═══════════════════════════════════════════════════════════ */
function trimHistory() {
  if (history.length > CFG.memWindow + 2) history = [history[0], ...history.slice(-(CFG.memWindow))];
}

/* ═══════════════════════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════════════════════ */
function openSidebar()   { el.sidebar().classList.add('open');    el.overlay().classList.add('show'); }
function closeSidebar()  { el.sidebar().classList.remove('open'); el.overlay().classList.remove('show'); }
function toggleSidebar() { el.sidebar().classList.contains('open') ? closeSidebar() : openSidebar(); }

/* ═══════════════════════════════════════════════════════════
   MODAL
═══════════════════════════════════════════════════════════ */
function showModal() { el.modalBack().classList.remove('hidden'); setTimeout(() => el.apiKeyInput().focus(), 50); }
function hideModal() { el.modalBack().classList.add('hidden'); el.chatInput().focus(); }

function toggleEye() {
  const inp = el.apiKeyInput(), show = el.eyeShow(), hide = el.eyeHide();
  if (inp.type === 'password') { inp.type='text'; show.style.display='none'; hide.style.display=''; }
  else                         { inp.type='password'; show.style.display=''; hide.style.display='none'; }
}

function saveModal() {
  const k = el.apiKeyInput().value.trim();
  if (!k.startsWith('gsk_')) {
    el.apiKeyInput().classList.add('shake');
    setTimeout(() => el.apiKeyInput().classList.remove('shake'), 500);
    toast('Key must start with gsk_', 'error'); return;
  }
  saveKey(k); hideModal(); toast('API key saved!', 'success');
}

/* ═══════════════════════════════════════════════════════════
   INPUT HELPERS
═══════════════════════════════════════════════════════════ */
function autoResize() {
  const ta = el.chatInput(); ta.style.height='auto'; ta.style.height=Math.min(ta.scrollHeight,160)+'px';
}
function clearInput() { el.chatInput().value=''; el.chatInput().style.height='auto'; updateCharCount(); }
function updateCharCount() {
  const n=el.chatInput().value.length, cc=el.charCount();
  cc.textContent=n; cc.classList.toggle('warn',n>3000&&n<=4000); cc.classList.toggle('over',n>4000);
}

/* ─── Stop/Send button toggle — CSS class driven ─────────── */
function showStopBtn() {
  const btns = $('input-btns');
  if (btns) btns.classList.add('is-streaming');
}
function hideStopBtn() {
  const btns = $('input-btns');
  if (btns) btns.classList.remove('is-streaming');
}

function lockUI() {
  el.chatInput().disabled = true;
  const dd = el.modelDropdown(); if (dd) { dd.classList.add('disabled'); closeModelDropdown(); }
  showStopBtn();
}
function unlockUI() {
  el.chatInput().disabled = false;
  const dd = el.modelDropdown(); if (dd) dd.classList.remove('disabled');
  hideStopBtn();
  el.chatInput().focus();
}

/* ═══════════════════════════════════════════════════════════
   STOP GENERATION
═══════════════════════════════════════════════════════════ */
function stopGeneration() {
  _stopped = true;                              // kills typeNext loop immediately
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

/* ═══════════════════════════════════════════════════════════
   COPY BUTTON HELPER
═══════════════════════════════════════════════════════════ */
function makeCopyBtn(text, label='copy') {
  const btn = document.createElement('button');
  btn.className = 'copy-msg-btn';
  btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> ${label}`;
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = '✓ copied';
      setTimeout(() => { btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> copy`; }, 2000);
    });
  });
  return btn;
}

function bindCopyCodeBtns(root) {
  root.querySelectorAll('.copy-code-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = document.getElementById(btn.dataset.target);
      if (code) navigator.clipboard.writeText(code.innerText).then(() => {
        btn.textContent = '✓ Copied';
        setTimeout(() => { btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`; }, 2000);
      });
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   APPEND STATIC MESSAGE
═══════════════════════════════════════════════════════════ */
function appendStaticMessage(role, content, time) {
  const es = $('empty-state'); if (es) es.remove();
  const row = document.createElement('div');
  row.className = `msg-row ${role}`;
  const avatarSVG = role === 'bot'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.5 2 3 6.5 3 11c0 2.8 1.2 5.2 3 6.8L7.5 22h9l1.5-4.2C20 16.2 21 13.8 21 11c0-4.5-3.5-9-9-9z" fill="white" opacity="0.95"/><circle cx="9" cy="11" r="1.7" fill="#22d3ee"/><circle cx="15" cy="11" r="1.7" fill="#22d3ee"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7" r="4" stroke="white" stroke-width="2"/></svg>`;

  row.innerHTML = `
    <div class="msg-avatar ${role}">${avatarSVG}</div>
    <div class="bubble-wrap">
      <div class="bubble ${role}">${role==='user' ? esc(content) : renderMd(content)}</div>
    </div>`;

  const wrap = row.querySelector('.bubble-wrap');
  const metaDiv = document.createElement('div');
  metaDiv.style.cssText = 'display:flex;align-items:center;gap:8px;';
  const timeSpan = document.createElement('span');
  timeSpan.className = 'msg-time'; timeSpan.textContent = time;
  metaDiv.appendChild(timeSpan);
  metaDiv.appendChild(makeCopyBtn(content));
  wrap.appendChild(metaDiv);

  bindCopyCodeBtns(row);
  el.messages().appendChild(row);
  scrollInstant();
}

/* ═══════════════════════════════════════════════════════════
   CREATE STREAM ROW
═══════════════════════════════════════════════════════════ */
function createStreamRow() {
  const es = $('empty-state'); if (es) es.remove();

  const thinkRow = document.createElement('div');
  thinkRow.className = 'thinking-row'; thinkRow.id = 'thinking-row';
  thinkRow.innerHTML = `
    <div class="msg-avatar bot"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.5 2 3 6.5 3 11c0 2.8 1.2 5.2 3 6.8L7.5 22h9l1.5-4.2C20 16.2 21 13.8 21 11c0-4.5-3.5-9-9-9z" fill="white" opacity="0.95"/><circle cx="9" cy="11" r="1.7" fill="#22d3ee"/><circle cx="15" cy="11" r="1.7" fill="#22d3ee"/></svg></div>
    <div class="thinking-bubble"><div class="thinking-dot"></div><div class="thinking-dot"></div><div class="thinking-dot"></div></div>`;
  el.messages().appendChild(thinkRow);
  scrollInstant();

  let streamRow=null, bubble=null, displayed='', queued='', typing=false;
  const CHAR_DELAY = 18;

  function typeNext() {
    if (_stopped || !queued.length) { typing = false; return; }   // _stopped kills loop instantly
    typing = true;
    displayed += queued[0];
    queued = queued.slice(1);
    if (bubble) {
      bubble.innerHTML = renderMd(displayed) + '<span class="cursor"></span>';
      if (_autoScroll) scrollInstant();   // instant = one scroll event, no animation race
    }
    setTimeout(typeNext, CHAR_DELAY);
  }

  return {
    tick(full) {
      const tr=$('thinking-row'); if(tr) tr.remove();
      if (!streamRow) {
        streamRow=document.createElement('div'); streamRow.className='msg-row bot';
        streamRow.innerHTML=`
          <div class="msg-avatar bot"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.5 2 3 6.5 3 11c0 2.8 1.2 5.2 3 6.8L7.5 22h9l1.5-4.2C20 16.2 21 13.8 21 11c0-4.5-3.5-9-9-9z" fill="white" opacity="0.95"/><circle cx="9" cy="11" r="1.7" fill="#22d3ee"/><circle cx="15" cy="11" r="1.7" fill="#22d3ee"/></svg></div>
          <div class="bubble-wrap"><div class="bubble bot"></div></div>`;
        el.messages().appendChild(streamRow);
        bubble=streamRow.querySelector('.bubble');
      }
      const newChars=full.slice(displayed.length+queued.length); queued+=newChars;
      if (!typing) typeNext();
    },

    done(full, time) {
      const tr=$('thinking-row'); if(tr) tr.remove();
      const newChars=full.slice(displayed.length+queued.length); if(newChars) queued+=newChars;
      if (!typing) typeNext();

      const finalise = () => {
        if (queued.length||typing) { setTimeout(finalise,30); return; }
        if (!streamRow||!bubble) return;
        bubble.innerHTML=renderMd(full);
        const wrap=streamRow.querySelector('.bubble-wrap');
        const metaDiv=document.createElement('div');
        metaDiv.style.cssText='display:flex;align-items:center;gap:8px;';
        const timeSpan=document.createElement('span'); timeSpan.className='msg-time'; timeSpan.textContent=time;
        metaDiv.appendChild(timeSpan);
        metaDiv.appendChild(makeCopyBtn(full));
        wrap.appendChild(metaDiv);
        bindCopyCodeBtns(streamRow);
        scrollInstant();
      };
      finalise();
    },

    error(msg) {
      const tr=$('thinking-row'); if(tr) tr.remove();
      if (bubble) bubble.innerHTML=`<span style="color:var(--red);font-size:12px;">⚠ ${esc(msg)}</span>`;
    },
  };
}

/* ═══════════════════════════════════════════════════════════
   RESET
═══════════════════════════════════════════════════════════ */
function resetChat() {
  if (streaming) return;
  messages=[]; history=[{role:'system',content:CFG.sysPrompt}];
  if (activeChat && chats[activeChat]) {
    chats[activeChat].messages=[]; chats[activeChat].history=[{role:'system',content:CFG.sysPrompt}];
    chats[activeChat].title='New Chat'; chats[activeChat].titled=false;
    saveChatsToStorage(); renderChatList();
  }
  const c=el.messages(); c.innerHTML=buildEmptyStateHTML();
  c.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click',()=>firePrompt(ch.dataset.p)));
  setStatus('ready'); el.errorBar().classList.remove('show'); updateStats();
  toast('Conversation reset','info',2000);
}

/* ═══════════════════════════════════════════════════════════
   TIME
═══════════════════════════════════════════════════════════ */
function nowTime() { return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }

/* ═══════════════════════════════════════════════════════════
   SEND MESSAGE
═══════════════════════════════════════════════════════════ */
async function send() {
  if (streaming) return;
  const text = el.chatInput().value.trim();
  if (!text) return;
  if (!getKey()) { showModal(); return; }

  const model = getActiveModel();
  streaming = true;
  _stopped  = false;       // reset stop flag for this new request
  _autoScroll = true;      // re-enable auto-scroll for new send
  lockUI(); clearInput(); setStatus('thinking');

  const ts=nowTime();
  messages.push({role:'user',content:text,time:ts});
  history.push({role:'user',content:text});
  trimHistory();
  appendStaticMessage('user',text,ts);
  updateStats();

  const streamRow=createStreamRow();
  let full='';

  abortController = new AbortController();

  try {
    const resp = await fetch(CFG.apiUrl, {
      method: 'POST',
      signal: abortController.signal,
      headers: {'Content-Type':'application/json','Authorization':'Bearer '+getKey()},
      body: JSON.stringify({
        model, messages:history,
        max_tokens: CFG.maxTokens,
        temperature: CFG.temp, stream:true,
      }),
    });

    if (!resp.ok) { const e=await resp.json().catch(()=>({})); throw new Error(e?.error?.message||'HTTP '+resp.status); }

    setStatus('streaming');
    const reader=resp.body.getReader(), decoder=new TextDecoder();
    while (true) {
      const {done,value}=await reader.read(); if(done) break;
      const chunk=decoder.decode(value,{stream:true});
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data=line.slice(6).trim(); if(data==='[DONE]') break;
        try { const tok=JSON.parse(data)?.choices?.[0]?.delta?.content; if(tok){full+=tok;streamRow.tick(full);} } catch{}
      }
    }

    // Auto-continue if cut off
    if (full.trim() && !/[.!?`]$/.test(full.trim()) && abortController) {
      try {
        const contResp=await fetch(CFG.apiUrl,{
          method:'POST', signal:abortController.signal,
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+getKey()},
          body:JSON.stringify({model,messages:[...history,{role:'assistant',content:full},{role:'user',content:'Continue.'}],max_tokens:CFG.contTokens,temperature:CFG.temp}),
        });
        if(contResp.ok){const cd=await contResp.json();const cont=cd.choices?.[0]?.message?.content||'';if(cont)full+=' '+cont;}
      } catch(_){}
    }

    streamRow.done(full,ts);
    messages.push({role:'assistant',content:full,time:ts});
    history.push({role:'assistant',content:full});
    saveChatsToStorage();

    // AI title after first exchange
    if (activeChat && messages.filter(m=>m.role==='user').length===1) generateChatTitle(activeChat);

  } catch(err) {
    if (err.name === 'AbortError') {
      // User pressed Stop — write whatever was streamed directly (bypass typewriter)
      if (full.trim()) {
        // Clear typewriter state then render final content immediately
        const tr = $('thinking-row'); if (tr) tr.remove();
        const existingBubble = document.querySelector('.msg-row.bot:last-child .bubble');
        if (existingBubble) {
          existingBubble.innerHTML = renderMd(full);
          // Add meta row (timestamp + copy)
          const wrap = existingBubble.closest('.bubble-wrap');
          if (wrap && !wrap.querySelector('.msg-time')) {
            const metaDiv = document.createElement('div');
            metaDiv.style.cssText = 'display:flex;align-items:center;gap:8px;';
            const timeSpan = document.createElement('span');
            timeSpan.className = 'msg-time'; timeSpan.textContent = ts;
            metaDiv.appendChild(timeSpan);
            metaDiv.appendChild(makeCopyBtn(full));
            wrap.appendChild(metaDiv);
          }
        }
        messages.push({ role:'assistant', content:full, time:ts });
        history.push({ role:'assistant', content:full });
        saveChatsToStorage();
      } else {
        const tr = $('thinking-row'); if (tr) tr.remove();
        streamRow && streamRow.error && streamRow.error('Generation stopped.');
      }
    } else {
      streamRow.error(err.message);
      showError(err.message);
      history.pop(); messages.pop();
    }
  }

  abortController = null;
  streaming=false; setStatus('ready'); unlockUI(); updateStats();
}

/* ═══════════════════════════════════════════════════════════
   FIRE PROMPT
═══════════════════════════════════════════════════════════ */
function firePrompt(text) { el.chatInput().value=text; autoResize(); updateCharCount(); send(); }

/* ═══════════════════════════════════════════════════════════
   BIND EVENTS
═══════════════════════════════════════════════════════════ */
function bindEvents() {
  el.menuBtn().addEventListener('click', toggleSidebar);
  el.overlay().addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => { if(e.key==='Escape'){ closeSidebar(); hideDeleteConfirm(); }});

  el.themeBtn().addEventListener('click', toggleTheme);

  el.changeKeyBtn().addEventListener('click', showModal);
  el.topbarKeyBtn().addEventListener('click', showModal);
  el.eyeBtn().addEventListener('click', toggleEye);
  el.modalSave().addEventListener('click', saveModal);
  el.apiKeyInput().addEventListener('keydown', e => { if(e.key==='Enter') saveModal(); });
  el.modalBack().addEventListener('click', e => { if(e.target===el.modalBack()&&getKey()) hideModal(); });

  el.resetBtn().addEventListener('click', resetChat);

  el.chatInput().addEventListener('input', () => { autoResize(); updateCharCount(); });
  el.chatInput().addEventListener('keydown', e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} });
  el.sendBtn().addEventListener('click', send);
  el.stopBtn().addEventListener('click', stopGeneration);

  el.messages().addEventListener('scroll', updateScrollBtn);
  el.scrollBtn().addEventListener('click', () => { _autoScroll = true; scrollBottom(); });

  // Delete confirm
  el.deleteYes().addEventListener('click', confirmDeleteChat);
  el.deleteNo().addEventListener('click', hideDeleteConfirm);
  el.deleteBackdrop().addEventListener('click', e => { if(e.target===el.deleteBackdrop()) hideDeleteConfirm(); });

  // New chat
  el.newChatBtn().addEventListener('click', createNewChat);

  // Model dropdown
  el.modelTrigger().addEventListener('click', e => { e.stopPropagation(); toggleModelDropdown(); });
  el.modelOptions().querySelectorAll('.model-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const model=opt.dataset.value;
      setActiveModel(model); closeModelDropdown();
      toast('Model: '+(MODEL_META[model]?.name||model),'info',2000);
    });
  });
  document.addEventListener('click', e => { if(!el.modelDropdown().contains(e.target)) closeModelDropdown(); });

  // Initial chip clicks (empty state already in DOM)
  document.querySelectorAll('#empty-state .chip').forEach(ch =>
    ch.addEventListener('click', () => firePrompt(ch.dataset.p))
  );
}

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
function init() {
  initCanvas();
  initTheme();
  bindEvents();
  renderSidebarPrompts();
  loadChatsFromStorage();

  if (Object.keys(chats).length === 0) {
    const id=genId();
    chats[id]={id,title:'New Chat',messages:[],history:[{role:'system',content:CFG.sysPrompt}],model:CFG.model};
    activeChat=id; saveChatsToStorage();
  } else {
    if (!activeChat||!chats[activeChat])
      activeChat=Object.keys(chats).sort((a,b)=>b.localeCompare(a))[0];
  }

  renderChatList();
  applyChatToUI(activeChat);
  updateStats();

  const key=getKey();
  if (!key) { showModal(); }
  else { el.apiKeyInput().value=key; el.chatInput().focus(); }
}

document.addEventListener('DOMContentLoaded', init);
