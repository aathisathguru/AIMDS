import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Check, Layers, TriangleAlert } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { generateFloors } from '../../data/mockData.js';
import './AddBlockModal.css';

const EMPTY = {
  name: '',
  code: '',
  floorCount: '3',
  location: '',
  description: '',
};

export default function AddBlockModal({ open, onClose, onCreate, existingCodes = [] }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    const value = key === 'code' ? e.target.value.toUpperCase().slice(0, 4) : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((x) => ({ ...x, [key]: undefined }));
  };

  // Live preview of the floor structure that will be generated.
  const preview = useMemo(() => {
    const n = Number(form.floorCount);
    if (!n || n < 1) return [];
    return generateFloors(form.code || 'NEW', Math.min(n, 12)).map((f) => ({
      code: f.code,
      name: f.name,
      short: f.short,
    }));
  }, [form.floorCount, form.code]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Block name is required';
    if (!form.code.trim()) e.code = 'Block ID is required';
    else if (!/^[A-Z0-9]{2,4}$/.test(form.code.trim()))
      e.code = 'Use 2–4 letters or digits, e.g. LT';
    else if (existingCodes.includes(form.code.trim()))
      e.code = `Block ID “${form.code}” already exists`;
    const n = Number(form.floorCount);
    if (!n || n < 1 || n > 12) e.floorCount = 'Enter between 1 and 12 floors';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Also wired to the footer button's onClick: sandboxed preview frames block
  // form submission, so the click path is the one that works there.
  const submittingRef = useRef(false);

  const submit = async (ev) => {
    ev?.preventDefault();
    if (submittingRef.current) return;
    if (!validate()) return;
    submittingRef.current = true;
    setBusy(true);
    try {
      await onCreate({
        name: form.name.trim(),
        code: form.code.trim(),
        floorCount: Number(form.floorCount),
        location: form.location.trim(),
        description: form.description.trim(),
      });
      setForm(EMPTY);
      setErrors({});
      onClose();
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  const close = () => {
    if (busy) return;
    setForm(EMPTY);
    setErrors({});
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      eyebrow="Provision"
      title="Add monitoring block"
      description="Register a new block. AIMDS generates the floor structure and provisions a default sensor set for each floor."
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button
            type="submit"
            form="add-block-form"
            onClick={submit}
            className="btn btn--primary"
            disabled={busy}
          >
            {busy ? (
              <>
                <span className="state-spinner" aria-hidden="true" />
                Provisioning…
              </>
            ) : (
              <>
                <Check size={16} aria-hidden="true" />
                Create block
              </>
            )}
          </button>
        </>
      }
    >
      <form id="add-block-form" className="abm" onSubmit={submit} noValidate>
        <div className="abm__grid">
          <div className="field abm__span">
            <label className="field__label" htmlFor="blk-name">
              Block name
            </label>
            <input
              id="blk-name"
              className="input"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Lotus"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'blk-name-err' : undefined}
            />
            {errors.name && (
              <p className="field__err" id="blk-name-err">
                <TriangleAlert size={12} aria-hidden="true" />
                {errors.name}
              </p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="blk-code">
              Block ID
            </label>
            <input
              id="blk-code"
              className="input num"
              value={form.code}
              onChange={set('code')}
              placeholder="LT"
              maxLength={4}
              aria-invalid={Boolean(errors.code)}
              aria-describedby={errors.code ? 'blk-code-err' : 'blk-code-hint'}
            />
            {errors.code ? (
              <p className="field__err" id="blk-code-err">
                <TriangleAlert size={12} aria-hidden="true" />
                {errors.code}
              </p>
            ) : (
              <p className="field__hint" id="blk-code-hint">
                Short code used across the UI and API
              </p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="blk-floors">
              Number of floors
            </label>
            <input
              id="blk-floors"
              className="input num"
              type="number"
              inputMode="numeric"
              min="1"
              max="12"
              value={form.floorCount}
              onChange={set('floorCount')}
              aria-invalid={Boolean(errors.floorCount)}
              aria-describedby={errors.floorCount ? 'blk-floors-err' : undefined}
            />
            {errors.floorCount && (
              <p className="field__err" id="blk-floors-err">
                <TriangleAlert size={12} aria-hidden="true" />
                {errors.floorCount}
              </p>
            )}
          </div>

          <div className="field abm__span">
            <label className="field__label" htmlFor="blk-loc">
              Location
            </label>
            <input
              id="blk-loc"
              className="input"
              value={form.location}
              onChange={set('location')}
              placeholder="e.g. East Campus · Sector 7"
            />
          </div>

          <div className="field abm__span">
            <label className="field__label" htmlFor="blk-desc">
              Description
            </label>
            <textarea
              id="blk-desc"
              className="textarea"
              value={form.description}
              onChange={set('description')}
              placeholder="What is monitored in this block?"
            />
          </div>
        </div>

        <section className="abm__preview" aria-live="polite">
          <header className="abm__preview-head">
            <span className="eyebrow eyebrow-accent">
              <Layers size={11} aria-hidden="true" /> Generated structure
            </span>
            <span className="abm__preview-count num">{preview.length} floors</span>
          </header>

          <div className="abm__stack">
            <div className="abm__roof" aria-hidden="true">
              <Building2 size={12} />
              <span className="num">{form.code || 'NEW'}</span>
            </div>
            {preview.length === 0 && (
              <p className="abm__empty">Enter a floor count to preview the structure.</p>
            )}
            {preview.map((f, i) => (
              <motion.div
                key={f.code}
                className="abm__slab"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.035, duration: 0.25 }}
              >
                <span className="abm__slab-tag num">{f.short}</span>
                <span className="abm__slab-name">{f.name}</span>
                <span className="abm__slab-meta num">5 sensors</span>
              </motion.div>
            ))}
          </div>

          <p className="abm__note">
            Each floor is provisioned with energy, water, temperature, humidity and power-load
            sensors. Connect the monitoring service to begin receiving live readings.
          </p>
        </section>
      </form>
    </Modal>
  );
}
