import { Building2, Home } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import './AddChoiceModal.css';

export default function AddChoiceModal({ open, onClose, onSelectAcademic, onSelectHostel }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Provision Estate Node"
      title="Add Infrastructure Entity"
      description="Choose the classification of facility you want to commission into AIMDS telemetry."
      size="sm"
      footer={
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="add-choice-grid">
        <button
          type="button"
          className="add-choice-card add-choice-card--academic"
          onClick={() => {
            onClose();
            onSelectAcademic();
          }}
        >
          <div className="add-choice-icon-wrap academic">
            <Building2 size={24} />
          </div>
          <div className="add-choice-text">
            <h3>Academic Block</h3>
            <p>Multi-floor lecture halls, laboratories, and educational complexes with floor elevations.</p>
          </div>
        </button>

        <button
          type="button"
          className="add-choice-card add-choice-card--hostel"
          onClick={() => {
            onClose();
            onSelectHostel();
          }}
        >
          <div className="add-choice-icon-wrap hostel">
            <Home size={24} />
          </div>
          <div className="add-choice-text">
            <h3>Hostel</h3>
            <p>Residential living blocks with direct incomer telemetry, bulk water, and no floor divisions.</p>
          </div>
        </button>
      </div>
    </Modal>
  );
}
