import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search } from 'lucide-react';
import { NAV_ITEMS } from '../../config/navigation.jsx';
import { useData } from '../../context/DataContext.jsx';
import Logo from '../ui/Logo.jsx';
import './CommandPalette.css';

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { blocks } = useData();
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const entries = useMemo(() => {
    const rows = NAV_ITEMS.map((n) => ({
      id: `nav-${n.id}`,
      group: 'Navigate',
      label: n.label,
      hint: n.to,
      to: n.to,
    }));

    blocks.forEach((b) => {
      const isHostel = b.category === 'hostel';
      rows.push({
        id: `blk-${b.code}`,
        group: 'Blocks',
        label: `${b.name} (${b.code})`,
        hint: b.location,
        to: isHostel ? `/blocks/hostel/${b.code}` : `/blocks/academics/${b.code}`,
      });
      (b.floors || []).forEach((f) => {
        rows.push({
          id: `flr-${f.id}`,
          group: 'Floors',
          label: `${b.name} · ${f.name}`,
          hint: `${(f.sensors || []).length} sensors · ${f.status}`,
          to: `/blocks/academics/${b.code}/floors/${f.code}`,
        });
        (f.sensors || []).forEach((s) => {
          rows.push({
            id: `sen-${s.id}`,
            group: 'Sensors',
            label: s.id,
            hint: `${s.type} · ${b.name} ${f.name}`,
            to: `/sensors?focus=${s.id}`,
          });
        });
      });
      (b.sensors || []).forEach((s) => {
        rows.push({
          id: `sen-${s.id}`,
          group: 'Sensors',
          label: s.id,
          hint: `${s.type} · ${b.name}`,
          to: `/sensors?focus=${s.id}`,
        });
      });
    });
    return rows;
  }, [blocks]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pool = term
      ? entries.filter(
          (e) =>
            e.label.toLowerCase().includes(term) ||
            (e.hint ?? '').toLowerCase().includes(term),
        )
      : entries.filter((e) => e.group === 'Navigate' || e.group === 'Blocks');
    return pool.slice(0, 24);
  }, [entries, q]);

  useEffect(() => {
    if (!open) {
      setQ('');
      setCursor(0);
      return undefined;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => setCursor(0), [q]);

  const go = (row) => {
    if (!row) return;
    navigate(row.to);
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[cursor]);
    }
  };


  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="cmdk-root">
          <motion.div
            className="cmdk__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className="cmdk__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Search AIMDS"
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            onKeyDown={onKeyDown}
          >
            <div className="cmdk__input-row">
              <Logo size="xs" />
              <Search size={16} aria-hidden="true" />
              <input
                ref={inputRef}
                className="cmdk__input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search blocks, floors, sensors or pages…"
                aria-label="Search AIMDS"
                autoComplete="off"
              />
              <kbd className="cmdk__esc">ESC</kbd>
            </div>

            <ul className="cmdk__list" role="listbox" aria-label="Search results">
              {results.length === 0 && (
                <li className="cmdk__empty">No matches for “{q}”</li>
              )}
              {results.map((row, i) => {
                const showGroup = row.group !== results[i - 1]?.group;
                return (
                  <li key={row.id}>
                    {showGroup && <p className="cmdk__group eyebrow">{row.group}</p>}
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === cursor}
                      className={`cmdk__row ${i === cursor ? 'is-cursor' : ''}`}
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => go(row)}
                    >
                      <span className="cmdk__label min0">{row.label}</span>
                      <span className="cmdk__hint min0">{row.hint}</span>
                      {i === cursor && <CornerDownLeft size={13} aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
