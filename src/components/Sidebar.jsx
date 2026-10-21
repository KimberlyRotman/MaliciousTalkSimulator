import { MessageCircle, Pin, Plus, Search, Settings2 } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { fmtTime } from '../utils.js';

const lastTime = c => c.messages.at(-1)?.time || 0;

export default function Sidebar({
  view, onViewChange, contacts, typing, search, onSearch, currentId, editingId,
  onOpenChat, onTogglePin, onEdit, onNew,
}) {
  const q = search.trim().toLowerCase();
  const filtered = contacts.filter(c => c.name.toLowerCase().includes(q));

  return (
    <aside className="sidebar">
      <header className="brand">
        <div className="brand-logo"><MessageCircle size={20} /></div>
        <div>
          <div className="brand-title">Talk Simulator</div>
          <div className="brand-sub">Simulador de conversas</div>
        </div>
      </header>

      <nav className="segmented">
        <button className={view === 'chats' ? 'active' : ''} onClick={() => onViewChange('chats')}>
          <MessageCircle size={16} /> Conversas
        </button>
        <button className={view === 'config' ? 'active' : ''} onClick={() => onViewChange('config')}>
          <Settings2 size={16} /> Configurações
        </button>
      </nav>

      <div className="search">
        <Search size={16} />
        <input type="search" placeholder="Pesquisar contato" value={search} onChange={e => onSearch(e.target.value)} />
      </div>

      {view === 'config' && (
        <div className="sidebar-actions">
          <button className="btn primary block" onClick={onNew}><Plus size={18} /> Novo contato</button>
        </div>
      )}

      <ul className="contact-list">
        {view === 'chats'
          ? [...filtered]
            .sort((a, b) => (b.pinned - a.pinned) || (lastTime(b) - lastTime(a)) || a.name.localeCompare(b.name))
            .map(c => (
              <ChatItem
                key={c.id}
                contact={c}
                typing={!!typing[c.id]}
                selected={currentId === c.id}
                onOpen={() => onOpenChat(c.id)}
                onTogglePin={() => onTogglePin(c.id)}
              />
            ))
          : [...filtered]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(c => (
              <li
                key={c.id}
                className={`contact${editingId === c.id ? ' selected' : ''}`}
                onClick={() => onEdit(c.id)}
              >
                <Avatar contact={c} size={42} />
                <div className="contact-body">
                  <div className="contact-name">{c.name}</div>
                  <div className="contact-preview">{c.script.length} passo(s) no roteiro</div>
                </div>
              </li>
            ))}
        {!filtered.length && (
          <li className="list-empty">
            {contacts.length ? 'Nenhum contato encontrado.' : view === 'chats'
              ? 'Nenhum contato ainda. Crie um na aba Configurações.'
              : 'Nenhum contato criado.'}
          </li>
        )}
      </ul>
    </aside>
  );
}

function ChatItem({ contact: c, typing, selected, onOpen, onTogglePin }) {
  const last = c.messages.at(-1);
  let preview = 'Toque para conversar';
  if (typing) preview = 'digitando...';
  else if (last) preview = (last.from === 'me' ? 'Você: ' : '') + (last.type === 'image' ? '📷 Imagem' : last.content);

  return (
    <li className={`contact${c.wolf ? ' wolf' : ''}${selected ? ' selected' : ''}`} onClick={onOpen}>
      <Avatar contact={c} size={48} />
      <div className="contact-body">
        <div className="contact-row">
          <span className="contact-name">{c.name}</span>
          {last && <span className={`contact-time${c.unread ? ' unread-time' : ''}`}>{fmtTime(last.time)}</span>}
        </div>
        <div className="contact-row">
          <span className={`contact-preview${typing ? ' typing' : ''}`}>{preview}</span>
          {c.unread > 0 && <span className="unread">{c.unread}</span>}
          <button
            className={`pin-btn${c.pinned ? ' on' : ''}`}
            title={c.pinned ? 'Desafixar conversa' : 'Fixar conversa'}
            onClick={e => { e.stopPropagation(); onTogglePin(); }}
          >
            <Pin size={15} />
          </button>
        </div>
      </div>
    </li>
  );
}
