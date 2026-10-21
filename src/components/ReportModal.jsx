import { useState } from 'react';
import {
  BadgeDollarSign, Baby, Check, EyeOff, Flag, Frown, MailWarning, Megaphone, MoreHorizontal, Swords, UserX,
} from 'lucide-react';
import { Modal, ModalClose } from './Modal.jsx';
import Avatar from './Avatar.jsx';

const REASONS = [
  { label: 'Spam ou mensagens indesejadas', icon: MailWarning },
  { label: 'Golpe ou fraude', icon: BadgeDollarSign },
  { label: 'Assédio ou bullying', icon: Frown },
  { label: 'Discurso de ódio', icon: Megaphone },
  { label: 'Conteúdo sexual ou nudez', icon: EyeOff },
  { label: 'Violência ou ameaças', icon: Swords },
  { label: 'Perfil falso ou se passando por outra pessoa', icon: UserX },
  { label: 'Exploração ou abuso infantil', icon: Baby },
  { label: 'Outro', icon: MoreHorizontal },
];

const MAX_DETAILS = 500;

export default function ReportModal({ contact, onClose, onSubmit }) {
  const [reasons, setReasons] = useState(contact.report?.reasons || []);
  const [details, setDetails] = useState(contact.report?.details || '');
  const toggle = label => setReasons(r => (r.includes(label) ? r.filter(x => x !== label) : [...r, label]));

  return (
    <Modal onClose={onClose} className="modal-report">
      <ModalClose onClose={onClose} />
      <div className="report-head">
        <div className="report-avatar">
          <Avatar contact={contact} size={52} />
          <span className="report-flag"><Flag size={14} /></span>
        </div>
        <div>
          <h2 className="modal-title">Denunciar {contact.name}</h2>
          <p className="modal-text">Por que você está denunciando este contato? Selecione um ou mais motivos. Denunciar não bloqueia o contato.</p>
        </div>
      </div>

      <div className="reason-grid">
        {REASONS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className={`reason-card${reasons.includes(label) ? ' selected' : ''}`}
            aria-pressed={reasons.includes(label)}
            onClick={() => toggle(label)}
          >
            <span className="reason-icon"><Icon size={18} /></span>
            <span className="reason-label">{label}</span>
            <span className="reason-check"><Check size={14} /></span>
          </button>
        ))}
      </div>

      <label className="field">
        <span className="field-label">Conte o que aconteceu <em>(opcional)</em></span>
        <textarea
          rows={3}
          maxLength={MAX_DETAILS}
          value={details}
          onChange={e => setDetails(e.target.value)}
          placeholder="Descreva mensagens suspeitas, pedidos estranhos, links..."
        />
        <span className="field-counter">{details.length}/{MAX_DETAILS}</span>
      </label>

      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
        <button
          type="button"
          className="btn danger"
          disabled={!reasons.length}
          onClick={() => onSubmit(REASONS.map(r => r.label).filter(l => reasons.includes(l)), details.trim())}
        >
          <Flag size={16} /> Enviar denúncia{reasons.length > 1 ? ` (${reasons.length})` : ''}
        </button>
      </div>
    </Modal>
  );
}
