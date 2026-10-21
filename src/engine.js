import { findContact, getState, uid, update } from './store.js';

const running = new Set();
const pending = new Set();
const generation = new Map();
let activeChatId = null;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const gen = id => generation.get(id) || 0;

export function bumpGeneration(id) {
  generation.set(id, gen(id) + 1);
}

export function setActiveChat(id) {
  activeChatId = id;
  if (id) {
    update(s => {
      const c = findContact(s, id);
      if (c && c.unread) c.unread = 0;
    });
    advance(id);
  }
}

export async function advance(id) {
  if (running.has(id)) { pending.add(id); return; }
  running.add(id);
  try {
    while (true) {
      const c = findContact(getState(), id);
      if (!c) return;
      const step = c.script[c.progress.index];
      if (!step) {
        if (c.progress.received) update(s => { findContact(s, id).progress.received = 0; });
        return;
      }
      if (step.type === 'wait') {
        if (c.progress.received < step.count) return;
        update(s => {
          const x = findContact(s, id);
          x.progress.received = 0;
          x.progress.index++;
        });
        continue;
      }

      const g = gen(id);
      const stale = () => !findContact(getState(), id) || gen(id) !== g;
      await sleep(500);
      if (stale()) return;
      update(s => { s.typing[id] = true; }, { save: false });
      await sleep(step.type === 'image' ? 1500 : Math.min(700 + step.content.length * 45, 3500));
      if (stale()) {
        update(s => { delete s.typing[id]; }, { save: false });
        return;
      }
      update(s => {
        delete s.typing[id];
        const cur = findContact(s, id);
        cur.messages.push({ id: uid(), from: 'them', type: step.type, content: step.content, time: Date.now() });
        cur.progress.index++;
        if (activeChatId !== id) cur.unread++;
      });
    }
  } finally {
    running.delete(id);
    if (pending.delete(id)) advance(id);
  }
}

export function sendUserMessage(id, type, content) {
  update(s => {
    const c = findContact(s, id);
    if (!c) return;
    c.messages.push({ id: uid(), from: 'me', type, content, time: Date.now() });
    // Only replies sent while the contact is actually waiting count toward a wait step.
    if (c.script[c.progress.index]?.type === 'wait') c.progress.received++;
  });
  advance(id);
}

export function resetConversation(id) {
  bumpGeneration(id);
  update(s => {
    const c = findContact(s, id);
    if (!c) return;
    delete s.typing[id];
    c.messages = [];
    c.progress = { index: 0, received: 0 };
    c.unread = 0;
  });
  if (activeChatId === id) advance(id);
}

export function removeContact(id) {
  bumpGeneration(id);
  update(s => {
    delete s.typing[id];
    s.contacts = s.contacts.filter(c => c.id !== id);
  });
}
