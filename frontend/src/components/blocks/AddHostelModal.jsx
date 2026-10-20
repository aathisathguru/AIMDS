import { useState } from 'react';
import { Home } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import './AddHostelModal.css';

export default function AddHostelModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Boys Hostel');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!name.trim()) {
      setError('Hostel name is required');
      return;
    }
    setBusy(true);
    try {
      const isBoys = category.includes('Boys');
      const prefix = isBoys ? 'H-B' : 'H-G';
      const cleanSlug = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
      const code = `${prefix}-${cleanSlug || Math.floor(100 + Math.random() * 900)}`;

      await onCreate({
        name: name.trim(),
        code,
        category: 'hostel',
        subCategory: isBoys ? 'boys' : 'girls',
        location: `${isBoys ? 'Boys' : 'Girls'} Residential Quad · Sector ${isBoys ? '8' : '9'}`,
        description: `${name.trim()} residential accommodation block with direct mains telemetry.`,
      });

      setName('');
      setCategory('Boys Hostel');
      setError('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (busy) return;
    setName('');
    setError('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      eyebrow="Residential Topology"
      title="Add Hostel"
      description="Register a new residential hostel block. Hostels use direct telemetry monitoring with no floor sub-meter divisions."
      size="md"
      footer={
        <>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary hostel-btn--purple"
            onClick={handleSubmit}
            disabled={busy}
          >
            {busy ? 'Adding…' : 'Add Hostel'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="stack stack--md hostel-modal__form">
        <div className="form-group">
          <label htmlFor="hostel-name-input" className="form-label">
            Hostel Name
          </label>
          <input
            id="hostel-name-input"
            type="text"
            className={`form-input ${error ? 'is-invalid' : ''}`}
            placeholder="e.g. Amber or Vaigai"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            autoFocus
          />
          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="hostel-category-select" className="form-label">
            Category
          </label>
          <select
            id="hostel-category-select"
            className="form-input form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Boys Hostel">Boys Hostel</option>
            <option value="Girls Hostel">Girls Hostel</option>
          </select>
        </div>

        <div className="hostel-modal__note">
          <Home size={14} className="hostel-modal__note-icon" aria-hidden="true" />
          <span>Hostels are configured for direct unit telemetry without floor sub-divisions.</span>
        </div>
      </form>
    </Modal>
  );
}
