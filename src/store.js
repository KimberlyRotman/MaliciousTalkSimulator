export const STORAGE_KEY = 'malicious-talk-simulator:data';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

let state = { contacts: [], typing: {} };
const listeners = new Set();

export const getState = () => state;

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const API_URL = 'api/data';
let fileStorage = false;
let saveTimer = null;

function saveToFile() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: state.contacts }),
    }).catch(() => { /* localStorage still holds the data */ });
  }, 300);
}

function persist() {
  if (fileStorage) saveToFile();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ contacts: state.contacts }));
  } catch {
    if (!fileStorage) {
      alert('Não foi possível salvar: o armazenamento do navegador está cheio. Use imagens menores ou exporte o JSON e remova contatos.');
    }
  }
}

// Mutates the current state, then publishes a new snapshot reference.
export function update(mutator, { save = true } = {}) {
  mutator(state);
  if (save) persist();
  state = { ...state };
  listeners.forEach(l => l());
}

export const findContact = (s, id) => s.contacts.find(c => c.id === id) || null;

export function isImageSrc(s) {
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

export function normalizeContact(c) {
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
      ? {
        reasons: Array.isArray(r.reasons) ? r.reasons.map(String) : r.reason ? [String(r.reason)] : [],
        details: String(r.details || ''),
        date: Number(r.date) || Date.now(),
      }
      : null,
    unread: Math.max(0, parseInt(c.unread, 10) || 0),
  };
}

export function normalizeData(d) {
  if (!d || !Array.isArray(d.contacts)) throw new Error('campo "contacts" ausente.');
  return d.contacts.map(normalizeContact);
}

export async function loadInitial() {
  let contacts = null;
  let fileMissing = false;
  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (res.ok) {
      contacts = normalizeData(await res.json());
      fileStorage = true;
    } else if (res.status === 404 && (res.headers.get('content-type') || '').indexOf('html') === -1) {
      fileStorage = true;
      fileMissing = true;
    }
  } catch { /* no file backend (e.g. file://) */ }
  if (!contacts) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) contacts = normalizeData(JSON.parse(raw));
    } catch (e) {
      console.error('Dados locais inválidos', e);
    }
  }
  if (!contacts) {
    // Optional preset next to index.html (only reachable when served over http).
    try {
      const res = await fetch('data.json', { cache: 'no-store' });
      if (res.ok) contacts = normalizeData(await res.json());
    } catch { /* no preset */ }
  }
  update(s => { s.contacts = contacts || []; }, { save: false });
  // First run with the file backend: migrate existing local data into data/data.json.
  if (fileMissing && contacts?.length) saveToFile();
}
