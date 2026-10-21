'use strict';

const STORAGE_KEY = 'malicious-talk-simulator:data';

const REPORT_REASONS = [
  'Spam ou mensagens indesejadas',
  'Golpe ou fraude',
  'Assédio ou bullying',
  'Discurso de ódio',
  'Conteúdo sexual ou nudez',
  'Violência ou ameaças',
  'Perfil falso ou se passando por outra pessoa',
  'Exploração ou abuso infantil',
  'Outro',
];

const STEP_LABELS = { text: 'Texto', image: 'Imagem', wait: 'Esperar' };

// Static SVG markup only; never put user data here.
const ICONS = {
  pin: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M16 3l5 5-2 1-3 3 1 5-2 2-4-4-5 5-1-1 5-5-4-4 2-2 5 1 3-3z"/></svg>',
  dots: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>',
  send: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>',
  clip: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M21 11l-8.5 8.5a5 5 0 01-7-7L14 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L15 7"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z"/></svg>',
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const $ = sel => document.querySelector(sel);

let state = { contacts: [] };
const ui = {
  view: 'chats',
  currentId: null,
  editingId: null,
  draft: null,
  search: '',
  typing: new Set(),
  menuOpen: false,
};
const running = new Set();
const pending = new Set();
const generation = new Map();
let mainKey = null;
let messagesKey = null;

/* ---------- Persistence ---------- */

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    alert('Não foi possível salvar: o armazenamento do navegador está cheio. Use imagens menores ou exporte o JSON e remova contatos.');
  }
}

async function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeData(JSON.parse(raw));
  } catch (e) {
    console.error('Dados locais inválidos', e);
  }
  // Optional preset shipped next to index.html (only works when served over http).
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    if (res.ok) return normalizeData(await res.json());
  } catch { /* no preset available */ }
  return { contacts: [] };
}

function isImageSrc(s) {
  return typeof s === 'string' && /^(data:image\/|https?:\/\/)/i.test(s);
}

function normalizeStep(s) {
  if (!s || typeof s !== 'object') return null;
  const id = typeof s.id === 'string' && s.id ? s.id : uid();
  if (s.type === 'wait') return { id, type: 'wait', count: Math.max(1, parseInt(s.count, 10) || 1) };
  if (s.type === 'image' && isImageSrc(s.content)) return { id, type: 'image', content: s.content };
  if (s.type === 'text' && typeof s.content === 'string') return { id, type: 'text', content: s.content };
  return null;
}

function normalizeMessage(m) {
  if (!m || (m.from !== 'me' && m.from !== 'them')) return null;
  const s = normalizeStep(m);
  if (!s || s.type === 'wait') return null;
  return { ...s, from: m.from, time: Number(m.time) || Date.now() };
}

function normalizeContact(c) {
  const r = c.report;
  return {
    id: typeof c.id === 'string' && c.id ? c.id : uid(),
    name: String(c.name || 'Sem nome').slice(0, 60),
    photo: isImageSrc(c.photo) ? c.photo : null,
    script: (Array.isArray(c.script) ? c.script : []).map(normalizeStep).filter(Boolean),
    messages: (Array.isArray(c.messages) ? c.messages : []).map(normalizeMessage).filter(Boolean),
    progress: {
      index: Math.max(0, parseInt(c.progress?.index, 10) || 0),
      received: Math.max(0, parseInt(c.progress?.received, 10) || 0),
    },
    pinned: !!c.pinned,
    wolf: !!c.wolf,
    report: r && typeof r === 'object'
      ? { reason: String(r.reason || ''), details: String(r.details || ''), date: Number(r.date) || Date.now() }
      : null,
    unread: Math.max(0, parseInt(c.unread, 10) || 0),
  };
}

function normalizeData(d) {
  if (!d || !Array.isArray(d.contacts)) throw new Error('campo "contacts" ausente.');
  return { contacts: d.contacts.map(normalizeContact) };
}

/* ---------- Helpers ---------- */

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k in n) n[k] = v;
    else n.setAttribute(k, v);
  }
  for (const ch of children.flat()) {
    if (ch == null || ch === false) continue;
    n.append(ch instanceof Node ? ch : String(ch));
  }
  return n;
}

const getContact = id => state.contacts.find(c => c.id === id) || null;

function fmtTime(t) {
  return new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}

function colorFor(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 45%, 55%)`;
}

function avatar(c, size = '') {
  const d = el('div', { class: `avatar ${size}` });
  if (c.photo) d.append(el('img', { src: c.photo, alt: '' }));
  else {
    d.textContent = initials(c.name || '');
    d.style.background = colorFor(c.id || c.name || 'x');
  }
  return d;
}

function readImage(file, max = 1000) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('not an image'));
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function pickImage(max, cb) {
  const input = el('input', {
    type: 'file',
    accept: 'image/*',
    onchange: async () => {
      const f = input.files[0];
      if (!f) return;
      try { cb(await readImage(f, max)); } catch { alert('Não foi possível carregar a imagem.'); }
    },
  });
  input.click();
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2000);
}

function openModal(content) {
  const overlay = el('div', { class: 'overlay', onclick: e => { if (e.target === overlay) closeModal(); } }, content);
  $('#modal-root').replaceChildren(overlay);
}

function closeModal() {
  $('#modal-root').replaceChildren();
}

/* ---------- Script engine ---------- */

async function advance(id) {
  if (running.has(id)) { pending.add(id); return; }
  running.add(id);
  try {
    while (true) {
      const c = getContact(id);
      if (!c) return;
      const step = c.script[c.progress.index];
      if (!step) {
        c.progress.received = 0;
        save();
        return;
      }
      if (step.type === 'wait') {
        if (c.progress.received < step.count) return;
        c.progress.received -= step.count;
        c.progress.index++;
        save();
        continue;
      }
      const gen = generation.get(id) || 0;
      const stale = () => !getContact(id) || (generation.get(id) || 0) !== gen;
      await sleep(500);
      if (stale()) return;
      ui.typing.add(id);
      render();
      await sleep(step.type === 'image' ? 1500 : Math.min(700 + step.content.length * 45, 3500));
      ui.typing.delete(id);
      if (stale()) { render(); return; }
      const cur = getContact(id);
      cur.messages.push({ id: uid(), from: 'them', type: step.type, content: step.content, time: Date.now() });
      cur.progress.index++;
      if (!(ui.view === 'chats' && ui.currentId === id)) cur.unread++;
      save();
      render();
    }
  } finally {
    running.delete(id);
    if (pending.delete(id)) advance(id);
  }
}

/* ---------- Actions ---------- */

function openChat(id) {
  const c = getContact(id);
  if (!c) return;
  ui.currentId = id;
  ui.menuOpen = false;
  c.unread = 0;
  save();
  render();
  advance(id);
  $('#composer-input')?.focus();
}

function sendUserMessage(type, content) {
  const c = getContact(ui.currentId);
  if (!c) return;
  c.messages.push({ id: uid(), from: 'me', type, content, time: Date.now() });
  c.progress.received++;
  save();
  render();
  advance(c.id);
}

function togglePin(id) {
  const c = getContact(id);
  c.pinned = !c.pinned;
  save();
  render();
}

function toggleWolf(id) {
  const c = getContact(id);
  c.wolf = !c.wolf;
  save();
  render();
}

function removeContact(id) {
  state.contacts = state.contacts.filter(c => c.id !== id);
  generation.set(id, (generation.get(id) || 0) + 1);
  ui.typing.delete(id);
  if (ui.currentId === id) ui.currentId = null;
  if (ui.editingId === id) { ui.editingId = null; ui.draft = null; }
  ui.menuOpen = false;
  save();
  render(true);
}

function blockContact(id) {
  const c = getContact(id);
  if (!c) return;
  if (!confirm(`Bloquear ${c.name}? O contato e toda a conversa serão excluídos.`)) return;
  removeContact(id);
  toast('Contato bloqueado e removido.');
}

function resetConversation(id) {
  const c = getContact(id);
  if (!c || !confirm(`Apagar a conversa com ${c.name} e reiniciar o roteiro?`)) return;
  generation.set(id, (generation.get(id) || 0) + 1);
  ui.typing.delete(id);
  c.messages = [];
  c.progress = { index: 0, received: 0 };
  c.unread = 0;
  save();
  render();
  toast('Conversa reiniciada.');
}

function openReportModal(id) {
  const c = getContact(id);
  if (!c) return;
  const details = el('textarea', { rows: 4, maxLength: 1000, placeholder: 'Descreva o que aconteceu (opcional)' });
  const error = el('p', { class: 'form-error' });
  const form = el('form', {
    class: 'modal',
    onsubmit: e => {
      e.preventDefault();
      const selected = form.querySelector('input[name="reason"]:checked');
      if (!selected) { error.textContent = 'Selecione um motivo.'; return; }
      const cur = getContact(id);
      if (cur) {
        cur.report = { reason: selected.value, details: details.value.trim(), date: Date.now() };
        save();
      }
      closeModal();
      render();
      toast('Denúncia enviada.');
    },
  },
    el('h2', {}, `Denunciar ${c.name}`),
    el('p', { class: 'muted' }, 'Selecione o motivo da denúncia. Denunciar não bloqueia o contato.'),
    el('div', { class: 'reasons' },
      REPORT_REASONS.map(r => el('label', { class: 'reason' },
        el('input', { type: 'radio', name: 'reason', value: r, checked: c.report?.reason === r }),
        el('span', {}, r)))),
    el('label', { class: 'field' }, el('span', {}, 'Detalhes'), details),
    error,
    el('div', { class: 'modal-actions' },
      el('button', { type: 'button', class: 'btn', onclick: closeModal }, 'Cancelar'),
      el('button', { type: 'submit', class: 'btn danger' }, 'Denunciar')),
  );
  details.value = c.report?.details || '';
  openModal(form);
}

function openLightbox(src) {
  openModal(el('img', { class: 'lightbox', src, alt: '', onclick: closeModal }));
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: 'malicious-talk-simulator.json' });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importJson(file) {
  try {
    const data = normalizeData(JSON.parse(await file.text()));
    if (!confirm(`Importar ${data.contacts.length} contato(s)? Os dados atuais serão substituídos.`)) return;
    state.contacts.forEach(c => generation.set(c.id, (generation.get(c.id) || 0) + 1));
    state = data;
    Object.assign(ui, { currentId: null, editingId: null, draft: null, menuOpen: false });
    ui.typing.clear();
    save();
    render(true);
    toast('Dados importados.');
  } catch (e) {
    alert('Arquivo JSON inválido: ' + e.message);
  }
}

/* ---------- Editor ---------- */

function openEditor(id) {
  const c = id ? getContact(id) : null;
  ui.editingId = c ? c.id : null;
  ui.draft = c
    ? structuredClone({ name: c.name, photo: c.photo, script: c.script })
    : { name: '', photo: null, script: [] };
  render(true);
}

function parseBulk(text) {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
    const wait = line.match(/^\*\s*esper(?:a|ar)\b\D*(\d+)?/i);
    if (wait) return { id: uid(), type: 'wait', count: Math.max(1, parseInt(wait[1], 10) || 1) };
    return { id: uid(), type: 'text', content: line.replace(/^"(.*)"$/, '$1') };
  });
}

function saveDraft() {
  const d = ui.draft;
  const name = d.name.trim();
  if (!name) { alert('Informe o nome do contato.'); return; }
  const script = d.script
    .filter(s => s.type !== 'text' || s.content.trim())
    .map(s => (s.type === 'text' ? { ...s, content: s.content.trim() } : s));
  if (ui.editingId) {
    const c = getContact(ui.editingId);
    c.name = name;
    c.photo = d.photo;
    c.script = script;
    c.progress.index = Math.min(c.progress.index, script.length);
  } else {
    const c = normalizeContact({ name, photo: d.photo, script });
    state.contacts.push(c);
    ui.editingId = c.id;
  }
  ui.draft = structuredClone({ name, photo: d.photo, script });
  save();
  render(true);
  toast('Contato salvo.');
}

function buildStep(s, i) {
  const d = ui.draft;
  const move = dir => {
    const j = i + dir;
    [d.script[i], d.script[j]] = [d.script[j], d.script[i]];
    renderMain(true);
  };
  let body;
  if (s.type === 'text') {
    body = el('textarea', { rows: 2, value: s.content, placeholder: 'Mensagem do contato', oninput: e => { s.content = e.target.value; } });
  } else if (s.type === 'image') {
    body = el('div', { class: 'step-image-body' },
      el('img', { src: s.content, alt: '' }),
      el('button', { class: 'btn small', onclick: () => pickImage(1000, src => { s.content = src; renderMain(true); }) }, 'Trocar imagem'));
  } else {
    body = el('label', { class: 'step-wait-body' },
      'Esperar',
      el('input', { type: 'number', min: 1, max: 99, value: s.count, oninput: e => { s.count = Math.max(1, parseInt(e.target.value, 10) || 1); } }),
      'mensagem(ns) minha(s)');
  }
  return el('li', { class: `step step-${s.type}` },
    el('span', { class: 'step-badge' }, STEP_LABELS[s.type]),
    body,
    el('div', { class: 'step-controls' },
      el('button', { title: 'Mover para cima', disabled: i === 0, onclick: () => move(-1) }, '▲'),
      el('button', { title: 'Mover para baixo', disabled: i === d.script.length - 1, onclick: () => move(1) }, '▼'),
      el('button', { title: 'Remover', onclick: () => { d.script.splice(i, 1); renderMain(true); } }, '✕')));
}

function buildEditor() {
  const d = ui.draft;
  const isNew = !ui.editingId;
  const bulk = el('textarea', { rows: 4, placeholder: 'olá\nbom dia\n*espera 2\ntudo bem também' });

  return el('div', { class: 'editor' },
    el('h2', {}, isNew ? 'Novo contato' : 'Editar contato'),
    el('section', { class: 'profile' },
      avatar({ id: ui.editingId || 'new', name: d.name || '?', photo: d.photo }, 'large'),
      el('div', { class: 'profile-fields' },
        el('label', { class: 'field' }, el('span', {}, 'Nome'),
          el('input', { type: 'text', value: d.name, maxLength: 60, placeholder: 'Nome do contato', oninput: e => { d.name = e.target.value; } })),
        el('div', { class: 'row' },
          el('button', { class: 'btn small', onclick: () => pickImage(400, src => { d.photo = src; renderMain(true); }) }, 'Escolher foto'),
          d.photo && el('button', { class: 'btn small', onclick: () => { d.photo = null; renderMain(true); } }, 'Remover foto')))),
    el('section', {},
      el('h3', {}, 'Roteiro de mensagens'),
      el('p', { class: 'hint' }, 'O contato envia os passos em ordem quando a conversa é aberta. Um passo "Esperar" pausa o roteiro até você enviar a quantidade indicada de mensagens.'),
      d.script.length
        ? el('ol', { class: 'steps' }, d.script.map(buildStep))
        : el('p', { class: 'empty' }, 'Nenhum passo no roteiro ainda.'),
      el('div', { class: 'row' },
        el('button', { class: 'btn small', onclick: () => { d.script.push({ id: uid(), type: 'text', content: '' }); renderMain(true); } }, '+ Texto'),
        el('button', { class: 'btn small', onclick: () => pickImage(1000, src => { d.script.push({ id: uid(), type: 'image', content: src }); renderMain(true); }) }, '+ Imagem'),
        el('button', { class: 'btn small', onclick: () => { d.script.push({ id: uid(), type: 'wait', count: 1 }); renderMain(true); } }, '+ Esperar respostas'))),
    el('section', { class: 'bulk' },
      el('h3', {}, 'Adicionar em lote'),
      el('p', { class: 'hint' }, 'Uma mensagem por linha. Use ', el('code', {}, '*espera 2'), ' para esperar 2 mensagens suas.'),
      bulk,
      el('div', { class: 'row', style: 'margin-top:8px' },
        el('button', {
          class: 'btn small',
          onclick: () => {
            const steps = parseBulk(bulk.value);
            if (!steps.length) return;
            d.script.push(...steps);
            renderMain(true);
          },
        }, 'Adicionar ao roteiro'))),
    el('div', { class: 'editor-footer' },
      el('button', { class: 'btn primary', onclick: saveDraft }, 'Salvar'),
      !isNew && el('button', { class: 'btn', onclick: () => resetConversation(ui.editingId) }, 'Reiniciar conversa'),
      !isNew && el('button', {
        class: 'btn outline-danger',
        onclick: () => {
          const c = getContact(ui.editingId);
          if (c && confirm(`Excluir ${c.name}?`)) removeContact(c.id);
        },
      }, 'Excluir contato'),
      el('button', { class: 'btn', onclick: () => { ui.editingId = null; ui.draft = null; render(true); } }, 'Fechar')));
}

/* ---------- Chat ---------- */

function buildChat() {
  const input = el('textarea', {
    id: 'composer-input',
    rows: 1,
    placeholder: 'Digite uma mensagem',
    onkeydown: e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
    },
  });
  const submit = () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    sendUserMessage('text', text);
    input.focus();
  };
  return el('section', { class: 'chat' },
    el('header', { class: 'chat-header', id: 'chat-header' }),
    el('div', { class: 'messages', id: 'messages' }),
    el('footer', { class: 'composer' },
      el('button', { class: 'icon-btn', title: 'Enviar imagem', html: ICONS.clip, onclick: () => pickImage(1000, src => sendUserMessage('image', src)) }),
      input,
      el('button', { class: 'icon-btn send', title: 'Enviar', html: ICONS.send, onclick: submit })));
}

function updateChatHeader() {
  const c = getContact(ui.currentId);
  const header = $('#chat-header');
  if (!c || !header) return;
  header.replaceChildren(
    el('button', { class: 'icon-btn back', title: 'Voltar', html: ICONS.back, onclick: () => { ui.currentId = null; render(); } }),
    avatar(c),
    el('div', { class: 'chat-title' },
      el('div', { class: 'chat-name-row' },
        el('span', { class: 'chat-name' }, c.name),
        c.report && el('span', { class: 'tag-reported', title: `Motivo: ${c.report.reason}` }, 'Contato denunciado')),
      el('div', { class: 'chat-status' }, ui.typing.has(c.id) ? 'digitando...' : 'online')),
    el('div', { class: 'chat-actions' },
      el('button', {
        class: 'wolf-btn' + (c.wolf ? ' active' : ''),
        'aria-pressed': String(c.wolf),
        title: c.wolf ? 'Desativar Lobo Mal' : 'Ativar Lobo Mal',
        onclick: () => toggleWolf(c.id),
      }, 'Lobo Mal'),
      el('div', { class: 'menu-wrap' },
        el('button', {
          class: 'icon-btn',
          title: 'Mais opções',
          html: ICONS.dots,
          onclick: e => { e.stopPropagation(); ui.menuOpen = !ui.menuOpen; updateChatHeader(); },
        }),
        ui.menuOpen && el('div', { class: 'dropdown', onclick: e => e.stopPropagation() },
          el('button', { onclick: () => { ui.menuOpen = false; updateChatHeader(); blockContact(c.id); } }, 'Bloquear contato'),
          el('button', { class: 'danger', onclick: () => { ui.menuOpen = false; updateChatHeader(); openReportModal(c.id); } }, 'Denunciar contato')))));
}

function msgBubble(m, box) {
  const content = m.type === 'image'
    ? el('img', { class: 'msg-img', src: m.content, alt: 'Imagem', onclick: () => openLightbox(m.content), onload: () => { box.scrollTop = box.scrollHeight; } })
    : el('div', { class: 'msg-text' }, m.content);
  return el('div', { class: `msg ${m.from}` }, content, el('span', { class: 'msg-time' }, fmtTime(m.time)));
}

function updateMessages() {
  const c = getContact(ui.currentId);
  const box = $('#messages');
  if (!c || !box) return;
  const typing = ui.typing.has(c.id);
  const key = `${c.id}:${c.messages.length}:${typing}`;
  if (key === messagesKey) return;
  messagesKey = key;
  box.replaceChildren(
    ...c.messages.map(m => msgBubble(m, box)),
    ...(typing ? [el('div', { class: 'msg them typing' }, el('span'), el('span'), el('span'))] : []));
  box.scrollTop = box.scrollHeight;
}

/* ---------- Rendering ---------- */

function sortChats(list) {
  const last = c => c.messages.at(-1)?.time || 0;
  return [...list].sort((a, b) => (b.pinned - a.pinned) || (last(b) - last(a)) || a.name.localeCompare(b.name));
}

function chatItem(c) {
  const last = c.messages.at(-1);
  const typing = ui.typing.has(c.id);
  let preview = 'Toque para conversar';
  if (typing) preview = 'digitando...';
  else if (last) preview = (last.from === 'me' ? 'Você: ' : '') + (last.type === 'image' ? 'Imagem' : last.content);

  return el('li', {
    class: 'contact' + (c.wolf ? ' wolf' : '') + (ui.currentId === c.id ? ' selected' : ''),
    onclick: () => openChat(c.id),
  },
    avatar(c),
    el('div', { class: 'contact-body' },
      el('div', { class: 'contact-row' },
        el('span', { class: 'contact-name' }, c.name),
        last && el('span', { class: 'contact-time' }, fmtTime(last.time))),
      el('div', { class: 'contact-row' },
        el('span', { class: 'contact-preview' + (typing ? ' typing' : '') }, preview),
        c.unread > 0 && el('span', { class: 'unread' }, c.unread),
        el('button', {
          class: 'pin-btn' + (c.pinned ? ' on' : ''),
          title: c.pinned ? 'Desafixar conversa' : 'Fixar conversa',
          html: ICONS.pin,
          onclick: e => { e.stopPropagation(); togglePin(c.id); },
        }))));
}

function configItem(c) {
  return el('li', {
    class: 'contact' + (ui.editingId === c.id ? ' selected' : ''),
    onclick: () => openEditor(c.id),
  },
    avatar(c, 'small'),
    el('div', { class: 'contact-body' },
      el('div', { class: 'contact-name' }, c.name),
      el('div', { class: 'contact-preview' }, `${c.script.length} passo(s) no roteiro`)));
}

function renderSidebar() {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === ui.view));
  const q = ui.search.trim().toLowerCase();
  const contacts = state.contacts.filter(c => c.name.toLowerCase().includes(q));
  const actions = $('#sidebar-actions');
  const list = $('#contact-list');

  if (ui.view === 'config') {
    actions.replaceChildren(
      el('button', { class: 'btn primary block', onclick: () => openEditor(null) }, '+ Novo contato'),
      el('div', { class: 'row' },
        el('button', { class: 'btn small', onclick: exportJson }, 'Exportar JSON'),
        el('button', { class: 'btn small', onclick: () => $('#import-input').click() }, 'Importar JSON')));
    const items = [...contacts].sort((a, b) => a.name.localeCompare(b.name)).map(configItem);
    list.replaceChildren(...(items.length ? items : [el('li', { class: 'empty' }, 'Nenhum contato criado.')]));
  } else {
    actions.replaceChildren();
    const items = sortChats(contacts).map(chatItem);
    list.replaceChildren(...(items.length
      ? items
      : [el('li', { class: 'empty' }, state.contacts.length ? 'Nenhum contato encontrado.' : 'Nenhum contato. Crie um na aba Configurações.')]));
  }
}

function placeholder(title, text) {
  return el('div', { class: 'placeholder' }, el('h2', {}, title), el('p', {}, text));
}

function renderMain(force = false) {
  const key = ui.view === 'chats' ? `c:${ui.currentId}` : `e:${ui.editingId}:${!!ui.draft}`;
  if (force || key !== mainKey) {
    mainKey = key;
    messagesKey = null;
    const main = $('#main');
    if (ui.view === 'chats') {
      main.replaceChildren(getContact(ui.currentId)
        ? buildChat()
        : placeholder('Malicious Talk Simulator', 'Selecione uma conversa para começar. Crie contatos e roteiros na aba Configurações.'));
    } else {
      main.replaceChildren(ui.draft
        ? buildEditor()
        : placeholder('Configurações', 'Crie um novo contato ou selecione um existente para editar nome, foto e roteiro de mensagens.'));
    }
  }
  if (ui.view === 'chats') {
    updateChatHeader();
    updateMessages();
  }
  const hasMain = ui.view === 'chats' ? !!getContact(ui.currentId) : !!ui.draft;
  $('.app').classList.toggle('show-main', hasMain);
}

function render(force = false) {
  renderSidebar();
  renderMain(force);
}

/* ---------- Init ---------- */

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  ui.view = tab.dataset.view;
  ui.menuOpen = false;
  render();
}));

$('#search').addEventListener('input', e => { ui.search = e.target.value; renderSidebar(); });

$('#import-input').addEventListener('change', e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (f) importJson(f);
});

document.addEventListener('click', () => {
  if (ui.menuOpen) { ui.menuOpen = false; updateChatHeader(); }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    if (ui.menuOpen) { ui.menuOpen = false; updateChatHeader(); }
  }
});

load().then(data => {
  state = data;
  render(true);
});
