import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Ban, CheckCheck, Flag, MoreVertical, Paperclip, SendHorizontal, WandSparkles } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { fmtTime, pickImage } from '../utils.js';

export default function ChatView({ contact: c, typing, onBack, onSend, onToggleWolf, onReset, onBlock, onReport, onOpenImage }) {
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [c.messages.length, typing]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = e => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    onSend('text', t);
    inputRef.current?.focus();
  };

  return (
    <section className="chat">
      <header className="chat-header">
        <button className="icon-btn back" onClick={onBack} title="Voltar"><ArrowLeft size={20} /></button>
        <Avatar contact={c} size={44} ring />
        <div className="chat-title">
          <div className="chat-name-row">
            <span className="chat-name">{c.name}</span>
            {c.report && (
              <span className="tag-reported" title={`Motivo(s): ${c.report.reasons.join(', ')}`}>
                <Flag size={12} /> Contato denunciado
              </span>
            )}
          </div>
          <div className={`chat-status${typing ? ' typing' : ''}`}>
            {typing ? 'digitando...' : <><span className="online-dot" /> online</>}
          </div>
        </div>

        <div className="chat-actions">
          <button
            className={`wolf-toggle${c.wolf ? ' active' : ''}`}
            aria-pressed={c.wolf}
            title={c.wolf ? 'Desativar Lobo Mal' : 'Ativar Lobo Mal'}
            onClick={onToggleWolf}
          >
            <span className="wolf-label">Lobo Mal</span>
            <span className="wolf-switch"><span className="wolf-knob" /></span>
          </button>

          <button className="icon-btn wand-btn" title="Reiniciar conversa" onClick={onReset}>
            <WandSparkles size={20} />
          </button>

          <div className="menu-wrap" ref={menuRef}>
            <button className={`icon-btn${menuOpen ? ' pressed' : ''}`} title="Mais opções" onClick={() => setMenuOpen(o => !o)}>
              <MoreVertical size={20} />
            </button>
            {menuOpen && (
              <div className="dropdown">
                <button onClick={() => { setMenuOpen(false); onBlock(); }}>
                  <span className="dropdown-icon"><Ban size={16} /></span>
                  <span>
                    <strong>Bloquear contato</strong>
                    <small>Exclui o contato e a conversa</small>
                  </span>
                </button>
                <button className="danger" onClick={() => { setMenuOpen(false); onReport(); }}>
                  <span className="dropdown-icon"><Flag size={16} /></span>
                  <span>
                    <strong>Denunciar contato</strong>
                    <small>Informe o motivo da denúncia</small>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={`messages${c.wolf ? ' wolf' : ''}`} ref={listRef}>
        {c.messages.length === 0 && !typing && (
          <div className="chat-hint">As mensagens desta conversa são simuladas.</div>
        )}
        {c.messages.map(m => (
          <div key={m.id} className={`msg ${m.from}${m.type === 'image' ? ' has-image' : ''}`}>
            {m.type === 'image'
              ? <img className="msg-img" src={m.content} alt="Imagem" onClick={() => onOpenImage(m.content)} />
              : <div className="msg-text">{m.content}</div>}
            <span className="msg-meta">
              {fmtTime(m.time)}
              {m.from === 'me' && <CheckCheck size={14} />}
            </span>
          </div>
        ))}
        {typing && (
          <div className="msg them typing-bubble"><span /><span /><span /></div>
        )}
      </div>

      <footer className="composer">
        <div className="composer-box">
          <button className="icon-btn" title="Enviar imagem" onClick={() => pickImage(1000, src => onSend('image', src))}>
            <Paperclip size={20} />
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            placeholder="Digite uma mensagem"
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
          />
        </div>
        <button className="send-btn" title="Enviar" onClick={submit} disabled={!text.trim()}>
          <SendHorizontal size={20} />
        </button>
      </footer>
    </section>
  );
}
