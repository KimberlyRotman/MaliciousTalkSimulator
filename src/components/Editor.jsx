import { useState } from 'react';
import {
  Camera, ChevronDown, ChevronUp, Hourglass, Image as ImageIcon, ListPlus, MessageSquare, RotateCcw, Save, Trash2, X,
} from 'lucide-react';
import Avatar from './Avatar.jsx';
import { uid } from '../store.js';
import { pickImage } from '../utils.js';

const STEP_META = {
  text: { label: 'Texto', icon: MessageSquare },
  image: { label: 'Imagem', icon: ImageIcon },
  wait: { label: 'Esperar', icon: Hourglass },
};

function parseBulk(text) {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
    const wait = line.match(/^\*\s*esper(?:a|ar)\b\D*(\d+)?/i);
    if (wait) return { id: uid(), type: 'wait', count: Math.max(1, parseInt(wait[1], 10) || 1) };
    return { id: uid(), type: 'text', content: line.replace(/^"(.*)"$/, '$1') };
  });
}

export default function Editor({ contact, onSave, onClose, onReset, onDelete }) {
  const [name, setName] = useState(contact?.name || '');
  const [photo, setPhoto] = useState(contact?.photo || null);
  const [script, setScript] = useState(() => structuredClone(contact?.script || []));
  const [bulk, setBulk] = useState('');
  const [error, setError] = useState('');

  const setStep = (i, patch) => setScript(s => s.map((st, j) => (j === i ? { ...st, ...patch } : st)));
  const move = (i, dir) => setScript(s => {
    const next = [...s];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    return next;
  });
  const add = step => setScript(s => [...s, { id: uid(), ...step }]);

  const save = () => {
    const n = name.trim();
    if (!n) { setError('Informe o nome do contato.'); return; }
    onSave({
      name: n,
      photo,
      script: script
        .filter(s => s.type !== 'text' || s.content.trim())
        .map(s => (s.type === 'text' ? { ...s, content: s.content.trim() } : s)),
    });
  };

  return (
    <div className="editor">
      <div className="editor-head">
        <div>
          <h2>{contact ? 'Editar contato' : 'Novo contato'}</h2>
          <p className="muted">Defina como o contato aparece e o que ele vai dizer.</p>
        </div>
        <button className="icon-btn" title="Fechar" onClick={onClose}><X size={20} /></button>
      </div>

      <section className="card profile">
        <button className="avatar-upload" title="Escolher foto" onClick={() => pickImage(400, setPhoto)}>
          <Avatar contact={{ id: contact?.id || 'new', name: name || '?', photo }} size={104} />
          <span className="avatar-upload-overlay"><Camera size={22} /></span>
        </button>
        <div className="profile-fields">
          <label className="field">
            <span className="field-label">Nome</span>
            <input
              type="text"
              value={name}
              maxLength={60}
              placeholder="Nome do contato"
              onChange={e => { setName(e.target.value); setError(''); }}
            />
          </label>
          {error && <span className="field-error">{error}</span>}
          <div className="row">
            <button className="btn soft small" onClick={() => pickImage(400, setPhoto)}><Camera size={15} /> Escolher foto</button>
            {photo && <button className="btn ghost small" onClick={() => setPhoto(null)}>Remover foto</button>}
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Roteiro de mensagens</h3>
        <p className="muted">
          O contato envia os passos em ordem quando a conversa é aberta. Um passo <strong>Esperar</strong> pausa
          o roteiro até você enviar a quantidade indicada de mensagens.
        </p>

        {script.length ? (
          <ol className="steps">
            {script.map((s, i) => {
              const { label, icon: Icon } = STEP_META[s.type];
              return (
                <li key={s.id} className={`step step-${s.type}`}>
                  <span className="step-index">{i + 1}</span>
                  <span className="step-badge"><Icon size={14} /> {label}</span>
                  <div className="step-body">
                    {s.type === 'text' && (
                      <textarea
                        rows={1}
                        value={s.content}
                        placeholder="Mensagem do contato"
                        onChange={e => setStep(i, { content: e.target.value })}
                      />
                    )}
                    {s.type === 'image' && (
                      <div className="step-image">
                        <img src={s.content} alt="" />
                        <button className="btn soft small" onClick={() => pickImage(1000, src => setStep(i, { content: src }))}>
                          Trocar imagem
                        </button>
                      </div>
                    )}
                    {s.type === 'wait' && (
                      <label className="step-wait-field">
                        Esperar
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={s.count}
                          onChange={e => setStep(i, { count: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        />
                        mensagem(ns) minha(s)
                      </label>
                    )}
                  </div>
                  <div className="step-controls">
                    <button title="Mover para cima" disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp size={16} /></button>
                    <button title="Mover para baixo" disabled={i === script.length - 1} onClick={() => move(i, 1)}><ChevronDown size={16} /></button>
                    <button title="Remover" className="danger" onClick={() => setScript(st => st.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="steps-empty">Nenhum passo no roteiro ainda.</div>
        )}

        <div className="row">
          <button className="chip" onClick={() => add({ type: 'text', content: '' })}><MessageSquare size={15} /> Texto</button>
          <button className="chip" onClick={() => pickImage(1000, src => add({ type: 'image', content: src }))}><ImageIcon size={15} /> Imagem</button>
          <button className="chip" onClick={() => add({ type: 'wait', count: 1 })}><Hourglass size={15} /> Esperar respostas</button>
        </div>
      </section>

      <section className="card">
        <h3>Adicionar em lote</h3>
        <p className="muted">Uma mensagem por linha. Use <code>*espera 2</code> para esperar 2 mensagens suas.</p>
        <textarea
          className="bulk"
          rows={4}
          value={bulk}
          placeholder={'olá\nbom dia\n*espera 2\ntudo bem também'}
          onChange={e => setBulk(e.target.value)}
        />
        <div className="row">
          <button
            className="btn soft small"
            disabled={!bulk.trim()}
            onClick={() => { setScript(s => [...s, ...parseBulk(bulk)]); setBulk(''); }}
          >
            <ListPlus size={15} /> Adicionar ao roteiro
          </button>
        </div>
      </section>

      <footer className="editor-footer">
        <button className="btn primary" onClick={save}><Save size={16} /> Salvar</button>
        {contact && <button className="btn soft" onClick={onReset}><RotateCcw size={16} /> Reiniciar conversa</button>}
        <span className="spacer" />
        {contact && <button className="btn danger-ghost" onClick={onDelete}><Trash2 size={16} /> Excluir contato</button>}
      </footer>
    </div>
  );
}
