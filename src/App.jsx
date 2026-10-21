import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CheckCircle2, MessageCircle, Settings2, Sparkles } from 'lucide-react';
import { findContact, getState, loadInitial, normalizeContact, subscribe, update } from './store.js';
import { removeContact, resetConversation, sendUserMessage, setActiveChat } from './engine.js';
import Sidebar from './components/Sidebar.jsx';
import ChatView from './components/ChatView.jsx';
import Editor from './components/Editor.jsx';
import ReportModal from './components/ReportModal.jsx';
import { ConfirmModal, ImageModal } from './components/Modal.jsx';

const SESSION_KEY = 'malicious-talk-simulator:ui';

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || {}; } catch { return {}; }
}

export default function App() {
  const state = useSyncExternalStore(subscribe, getState);
  const session = useRef(readSession()).current;
  const [view, setView] = useState(session.view === 'config' ? 'config' : 'chats');
  const [currentId, setCurrentId] = useState(session.currentId || null);
  const [editing, setEditing] = useState(null); // { id: string|null, key: number }
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const current = findContact(state, currentId);
  const editingContact = editing?.id ? findContact(state, editing.id) : null;

  useEffect(() => { loadInitial(); }, []);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ view, currentId }));
  }, [view, currentId]);

  const activeId = view === 'chats' && current ? current.id : null;
  useEffect(() => { setActiveChat(activeId); }, [activeId]);

  const showToast = msg => {
    setToast({ msg, key: Date.now() });
  };
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const confirm = opts => setModal({ type: 'confirm', ...opts });

  const mutateContact = (id, fn) => update(s => { const c = findContact(s, id); if (c) fn(c); });

  const handleBlock = c => confirm({
    title: `Bloquear ${c.name}?`,
    message: 'O contato e toda a conversa serão excluídos permanentemente.',
    confirmLabel: 'Bloquear',
    danger: true,
    onConfirm: () => {
      removeContact(c.id);
      setCurrentId(null);
      showToast('Contato bloqueado');
    },
  });

  const handleReport = (id, reasons, details) => {
    mutateContact(id, c => { c.report = { reasons, details, date: Date.now() }; });
    setModal(null);
    showToast('Denúncia enviada');
  };

  const handleSave = draft => {
    let id = editing?.id;
    if (id && findContact(getState(), id)) {
      mutateContact(id, c => {
        c.name = draft.name;
        c.photo = draft.photo;
        c.script = draft.script;
        c.progress.index = Math.min(c.progress.index, draft.script.length);
      });
    } else {
      const c = normalizeContact(draft);
      id = c.id;
      update(s => { s.contacts.push(c); });
    }
    setEditing({ id, key: Date.now() });
    showToast('Contato salvo');
  };

  const hasMain = view === 'chats' ? !!current : !!editing;

  let main;
  if (view === 'chats') {
    main = current ? (
      <ChatView
        key={current.id}
        contact={current}
        typing={!!state.typing[current.id]}
        onBack={() => setCurrentId(null)}
        onSend={(type, content) => sendUserMessage(current.id, type, content)}
        onToggleWolf={() => mutateContact(current.id, c => { c.wolf = !c.wolf; })}
        onReset={() => {
          resetConversation(current.id);
          mutateContact(current.id, c => { c.report = null; c.wolf = false; });
          showToast('Conversa reiniciada');
        }}
        onBlock={() => handleBlock(current)}
        onReport={() => setModal({ type: 'report', id: current.id })}
        onOpenImage={src => setModal({ type: 'image', src })}
      />
    ) : (
      <EmptyState
        icon={<MessageCircle size={36} />}
        title="Malicious Talk Simulator"
        text="Selecione uma conversa para começar. Crie contatos e roteiros na aba Configurações."
      />
    );
  } else {
    main = editing ? (
      <Editor
        key={editing.key}
        contact={editingContact}
        onSave={handleSave}
        onClose={() => setEditing(null)}
        onReset={() => editingContact && confirm({
          title: 'Reiniciar conversa?',
          message: `A conversa com ${editingContact.name} será apagada e o roteiro começará do início.`,
          confirmLabel: 'Reiniciar',
          onConfirm: () => { resetConversation(editingContact.id); showToast('Conversa reiniciada'); },
        })}
        onDelete={() => editingContact && confirm({
          title: `Excluir ${editingContact.name}?`,
          message: 'O contato e a conversa serão removidos permanentemente.',
          confirmLabel: 'Excluir',
          danger: true,
          onConfirm: () => {
            removeContact(editingContact.id);
            setEditing(null);
            if (currentId === editingContact.id) setCurrentId(null);
            showToast('Contato excluído');
          },
        })}
      />
    ) : (
      <EmptyState
        icon={<Settings2 size={36} />}
        title="Configurações"
        text="Crie um novo contato ou selecione um existente para editar nome, foto e roteiro de mensagens."
      />
    );
  }

  const reportContact = modal?.type === 'report' ? findContact(state, modal.id) : null;

  return (
    <div className="backdrop">
      <div className={`shell${hasMain ? ' show-main' : ''}`}>
        <Sidebar
          view={view}
          onViewChange={setView}
          contacts={state.contacts}
          typing={state.typing}
          search={search}
          onSearch={setSearch}
          currentId={currentId}
          editingId={editing?.id}
          onOpenChat={setCurrentId}
          onTogglePin={id => mutateContact(id, c => { c.pinned = !c.pinned; })}
          onEdit={id => setEditing({ id, key: Date.now() })}
          onNew={() => setEditing({ id: null, key: Date.now() })}
        />
        <main className="main">{main}</main>
      </div>

      {reportContact && (
        <ReportModal
          contact={reportContact}
          onClose={() => setModal(null)}
          onSubmit={(reasons, details) => handleReport(reportContact.id, reasons, details)}
        />
      )}
      {modal?.type === 'confirm' && <ConfirmModal {...modal} onClose={() => setModal(null)} />}
      {modal?.type === 'image' && <ImageModal src={modal.src} onClose={() => setModal(null)} />}

      {toast && (
        <div className="toast" key={toast.key}>
          <CheckCircle2 size={18} /> {toast.msg}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}<Sparkles className="empty-spark" size={18} /></div>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
