import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, GraduationCap, Home, Search } from 'lucide-react';
import StatusIndicator from '../ui/StatusIndicator.jsx';
import './LocationSelector.css';

export default function LocationSelector({ blocks, activeBlock, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all'); // all | academic | hostel
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  const selected = useMemo(
    () => blocks.find((b) => b.code === activeBlock) ?? blocks[0],
    [blocks, activeBlock],
  );

  const academicBlocks = useMemo(
    () => blocks.filter((b) => b.category === 'academic' || !b.category?.includes('hostel')),
    [blocks],
  );

  const hostelBlocks = useMemo(
    () => blocks.filter((b) => b.category === 'hostel' || b.category?.includes('hostel')),
    [blocks],
  );

  const filteredAcademic = useMemo(() => {
    if (filterCategory === 'hostel') return [];
    if (!searchQuery.trim()) return academicBlocks;
    const q = searchQuery.toLowerCase();
    return academicBlocks.filter(
      (b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q),
    );
  }, [academicBlocks, filterCategory, searchQuery]);

  const filteredHostel = useMemo(() => {
    if (filterCategory === 'academic') return [];
    if (!searchQuery.trim()) return hostelBlocks;
    const q = searchQuery.toLowerCase();
    return hostelBlocks.filter(
      (b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q),
    );
  }, [hostelBlocks, filterCategory, searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const handleDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const handleChoose = (code) => {
    onSelect(code);
    setIsOpen(false);
  };

  return (
    <div className="loc-sel" ref={containerRef}>
      <button
        type="button"
        className={`loc-sel__trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select location"
      >
        <span className="loc-sel__trigger-icon" aria-hidden="true">
          {selected?.category === 'hostel' ? <Home size={14} /> : <GraduationCap size={14} />}
        </span>
        <span className="loc-sel__trigger-text">
          <span className="loc-sel__trigger-label">Location:</span>
          <span className="loc-sel__trigger-name">{selected?.name}</span>
          <span className="loc-sel__trigger-code num">({selected?.code})</span>
        </span>
        <ChevronDown size={14} className="loc-sel__trigger-arrow" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="loc-sel__popover"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Filter bar */}
            <div className="loc-sel__filter-row">
              <div className="loc-sel__search-wrap">
                <Search size={13} className="loc-sel__search-icon" aria-hidden="true" />
                <input
                  type="text"
                  className="loc-sel__search-input"
                  placeholder="Filter locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="loc-sel__pills" role="tablist">
                <button
                  type="button"
                  className={`loc-sel__pill ${filterCategory === 'all' ? 'is-active' : ''}`}
                  onClick={() => setFilterCategory('all')}
                >
                  All ({blocks.length})
                </button>
                <button
                  type="button"
                  className={`loc-sel__pill ${filterCategory === 'academic' ? 'is-active' : ''}`}
                  onClick={() => setFilterCategory('academic')}
                >
                  Academic ({academicBlocks.length})
                </button>
                <button
                  type="button"
                  className={`loc-sel__pill ${filterCategory === 'hostel' ? 'is-active' : ''}`}
                  onClick={() => setFilterCategory('hostel')}
                >
                  Hostels ({hostelBlocks.length})
                </button>
              </div>
            </div>

            <div className="loc-sel__scroll" role="listbox">
              {/* Academic blocks section */}
              {filteredAcademic.length > 0 && (
                <div className="loc-sel__group">
                  <div className="loc-sel__group-head">
                    <GraduationCap size={13} aria-hidden="true" />
                    <span>Academic Blocks</span>
                    <span className="loc-sel__group-count num">{filteredAcademic.length}</span>
                  </div>
                  <ul className="loc-sel__list">
                    {filteredAcademic.map((b) => {
                      const isSelected = b.code === activeBlock;
                      return (
                        <li key={b.code}>
                          <button
                            type="button"
                            className={`loc-sel__item ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => handleChoose(b.code)}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <StatusIndicator
                              status={b.status === 'attention' ? 'attention' : 'operational'}
                              size="sm"
                            />
                            <div className="loc-sel__item-meta min0">
                              <div className="loc-sel__item-line">
                                <span className="loc-sel__item-name">{b.name}</span>
                                <span className="loc-sel__item-code num">({b.code})</span>
                              </div>
                              <span className="loc-sel__item-sub">
                                {b.floors?.length ? `${b.floors.length} floors` : 'Direct Unit'} ·{' '}
                                {b.sensorCount} sensors
                              </span>
                            </div>
                            {isSelected && (
                              <Check size={14} className="loc-sel__item-check" aria-hidden="true" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Hostels section */}
              {filteredHostel.length > 0 && (
                <div className="loc-sel__group">
                  <div className="loc-sel__group-head">
                    <Home size={13} aria-hidden="true" />
                    <span>Hostels & Residential</span>
                    <span className="loc-sel__group-count num">{filteredHostel.length}</span>
                  </div>
                  <ul className="loc-sel__list">
                    {filteredHostel.map((b) => {
                      const isSelected = b.code === activeBlock;
                      return (
                        <li key={b.code}>
                          <button
                            type="button"
                            className={`loc-sel__item ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => handleChoose(b.code)}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <StatusIndicator status="operational" size="sm" />
                            <div className="loc-sel__item-meta min0">
                              <div className="loc-sel__item-line">
                                <span className="loc-sel__item-name">{b.name}</span>
                                <span className="loc-sel__item-code num">({b.code})</span>
                              </div>
                              <span className="loc-sel__item-sub">
                                Residential Unit · {b.sensorCount} sensors
                              </span>
                            </div>
                            {isSelected && (
                              <Check size={14} className="loc-sel__item-check" aria-hidden="true" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {filteredAcademic.length === 0 && filteredHostel.length === 0 && (
                <p className="loc-sel__empty">No locations match "{searchQuery}"</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
