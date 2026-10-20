import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useIsMobile } from '../../hooks/useMediaQuery.js';
import './Modal.css';

/**
 * Responsive dialog: centred modal on tablet/desktop, bottom sheet on
 * phones. Focus is trapped, Escape closes, body scroll is locked.
 */
export default function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  size = 'md', // sm | md | lg
  labelledBy = 'aimds-modal-title',
}) {
  const isMobile = useIsMobile();
  const panelRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    restoreRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey, true);
    const t = setTimeout(() => {
      const target = panelRef.current?.querySelector(
        'input, select, textarea, button:not(.modal__close)',
      );
      (target ?? panelRef.current)?.focus?.();
    }, 60);

    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  const sheet = isMobile;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="modal-root" role="presentation">
          <motion.div
            className="modal__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            className={`modal__panel modal__panel--${size} ${sheet ? 'is-sheet' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            initial={sheet ? { y: '100%' } : { opacity: 0, y: 18, scale: 0.97 }}
            animate={sheet ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={sheet ? { y: '100%' } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
          >
            {sheet && <div className="modal__grab" aria-hidden="true" />}
            <header className="modal__head">
              <div className="min0">
                {eyebrow && <p className="eyebrow eyebrow-accent">{eyebrow}</p>}
                <h2 id={labelledBy} className="modal__title">
                  {title}
                </h2>
                {description && <p className="modal__desc">{description}</p>}
              </div>
              <button
                type="button"
                className="icon-btn modal__close"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal__body">{children}</div>

            {footer && <footer className="modal__foot">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
