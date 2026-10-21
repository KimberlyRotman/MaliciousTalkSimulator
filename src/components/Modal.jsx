import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function Modal({ onClose, children, className = '' }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${className}`} role="dialog" aria-modal="true">{children}</div>
    </div>
  );
}

export function ModalClose({ onClose }) {
  return (
    <button className="modal-close" onClick={onClose} title="Fechar">
      <X size={18} />
    </button>
  );
}

export function ConfirmModal({ title, message, confirmLabel = 'Confirmar', danger, hideCancel, onConfirm, onClose }) {
  return (
    <Modal onClose={onClose} className="modal-sm">
      <div className={`modal-icon${danger ? ' danger' : ''}`}><AlertTriangle size={22} /></div>
      <h2 className="modal-title">{title}</h2>
      <p className="modal-text">{message}</p>
      <div className="modal-actions">
        {!hideCancel && <button className="btn ghost" onClick={onClose}>Cancelar</button>}
        <button
          className={`btn ${danger ? 'danger' : 'primary'}`}
          onClick={() => { onConfirm(); onClose(); }}
          autoFocus
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function ImageModal({ src, onClose }) {
  return (
    <Modal onClose={onClose} className="modal-image">
      <ModalClose onClose={onClose} />
      <img src={src} alt="" />
    </Modal>
  );
}
