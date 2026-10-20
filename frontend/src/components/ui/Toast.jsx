import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import './Toast.css';

const ToastContext = createContext(null);

const ICONS = { success: CircleCheck, info: Info, warning: TriangleAlert };

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    ({ title, message, tone = 'info', duration = 4200 }) => {
      idRef.current += 1;
      const id = idRef.current;
      setItems((prev) => [...prev.slice(-2), { id, title, message, tone }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-wrap" role="region" aria-label="Notifications">
          <AnimatePresence initial={false}>
            {items.map((t) => {
              const Icon = ICONS[t.tone] ?? Info;
              return (
                <motion.div
                  key={t.id}
                  className={`toast toast--${t.tone}`}
                  role="status"
                  aria-live="polite"
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                >
                  <Icon size={16} className="toast__icon" aria-hidden="true" />
                  <div className="min0">
                    <p className="toast__title">{t.title}</p>
                    {t.message && <p className="toast__msg">{t.message}</p>}
                  </div>
                  <button
                    type="button"
                    className="toast__close"
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss notification"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
