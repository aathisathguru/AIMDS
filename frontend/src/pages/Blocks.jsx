import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Boxes,
  Building2,
  Droplets,
  Gauge,
  Home,
  Layers,
  Plus,
  Radio,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Logo from '../components/ui/Logo.jsx';
import BlocksBreadcrumb from '../components/blocks/BlocksBreadcrumb.jsx';
import AcademicBlockCard from '../components/blocks/AcademicBlockCard.jsx';
import HostelCard from '../components/blocks/HostelCard.jsx';
import AddBlockModal from '../components/blocks/AddBlockModal.jsx';
import AddHostelModal from '../components/blocks/AddHostelModal.jsx';
import AddChoiceModal from '../components/blocks/AddChoiceModal.jsx';
import StatusIndicator from '../components/ui/StatusIndicator.jsx';
import { EmptyState } from '../components/ui/States.jsx';
import { useData } from '../context/DataContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { formatNumber } from '../utils/format.js';
import './Blocks.css';

export default function Blocks() {
  const { pathname } = useLocation();
  const { blocks, addBlock, stats } = useData();
  const { push } = useToast();

  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [addHostelOpen, setAddHostelOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);

  // Distinguish whether operator is on /blocks, /blocks/academics, or /blocks/hostel
  const isAcademics = pathname === '/blocks/academics' || pathname === '/blocks/academics/';
  const isHostel =
    pathname === '/blocks/hostel' ||
    pathname === '/blocks/hostel/' ||
    pathname === '/blocks/hostels';

  // Academic blocks (category !== 'hostel' or category === 'academic')
  const academicList = blocks.filter((b) => b.category !== 'hostel');

  // Hostel blocks
  const hostelList = blocks.filter((b) => b.category === 'hostel');
  const boysHostels = hostelList.filter((h) => h.subCategory === 'boys');
  const girlsHostels = hostelList.filter((h) => h.subCategory !== 'boys');

  const handleCreateBlock = async (payload) => {
    const created = await addBlock(payload);
    push({
      tone: 'success',
      title: `${created.name} (${created.code}) provisioned`,
      message: `${created.floors.length} floors and ${created.sensorCount} sensors generated.`,
    });
  };

  const handleCreateHostel = async (payload) => {
    const created = await addBlock(payload);
    push({
      tone: 'success',
      title: `${created.name} Hostel registered`,
      message: `Direct utility telemetry active. No floors configured.`,
    });
  };

  // Aggregated totals for main categories
  const academicWater = academicList.reduce((sum, b) => sum + (b.totals?.water ?? 0), 0);
  const academicPower = academicList.reduce(
    (sum, b) => sum + (b.totals?.load ?? b.power ?? 0),
    0
  );
  const academicFloors = academicList.reduce((sum, b) => sum + (b.floors?.length ?? 0), 0);

  const hostelWater = hostelList.reduce((sum, h) => sum + (h.water ?? h.totals?.water ?? 0), 0);
  const hostelPower = hostelList.reduce((sum, h) => sum + (h.power ?? h.totals?.load ?? 0), 0);

  /* ========================================================================
     VIEW 2: ACADEMICS (/blocks/academics)
     ======================================================================== */
  if (isAcademics) {
    return (
      <div className="stack stack--lg">
        {/* Breadcrumb: Blocks > Academics */}
        <BlocksBreadcrumb items={[{ label: 'Academics' }]} />

        <PageHeader
          eyebrow="Campus Infrastructure"
          title="Academics"
          subtitle="Monitored educational blocks with floor-level telemetry, elevation visualization, and individual slab sub-metering."
          meta={
            <>
              <div className="blocks__brand-badge">
                <Logo size="xs" />
                <span className="eyebrow eyebrow-accent">AIMDS Academic Topology</span>
              </div>
              <span className="blocks__stat num">
                <strong>{academicList.length}</strong> blocks
              </span>
              <span className="blocks__stat num">
                <strong>{academicFloors}</strong> floors
              </span>
              <StatusIndicator status="operational" label="All Live" size="sm" />
            </>
          }
          actions={
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setAddBlockOpen(true)}
            >
              <Plus size={16} aria-hidden="true" />
              + Add Block
            </button>
          }
        />

        {academicList.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No academic blocks found"
            message="Provision your first academic block to begin monitoring floor utilities."
            action={
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setAddBlockOpen(true)}
              >
                <Plus size={14} aria-hidden="true" />
                + Add Block
              </button>
            }
          />
        ) : (
          <div className="blocks__grid-2col">
            {academicList.map((block, i) => (
              <AcademicBlockCard key={block.code} block={block} index={i} />
            ))}
          </div>
        )}

        <AddBlockModal
          open={addBlockOpen}
          onClose={() => setAddBlockOpen(false)}
          onCreate={handleCreateBlock}
          existingCodes={blocks.map((b) => b.code)}
        />
      </div>
    );
  }

  /* ========================================================================
     VIEW 3: HOSTEL (/blocks/hostel)
     ======================================================================== */
  if (isHostel) {
    return (
      <div className="stack stack--lg hostel-page-view">
        {/* Breadcrumb: Blocks > Hostel */}
        <BlocksBreadcrumb items={[{ label: 'Hostel' }]} />

        <PageHeader
          eyebrow="Campus Accommodations"
          title="Hostel"
          subtitle="Residential facility telemetry with direct mains incomer monitoring. Hostels monitor bulk flow and power without floor sub-divisions."
          meta={
            <>
              <div className="blocks__brand-badge hostel-badge-purple">
                <Logo size="xs" />
                <span className="eyebrow hostel-eyebrow-purple">AIMDS Residential Telemetry</span>
              </div>
              <span className="blocks__stat num">
                <strong>{hostelList.length}</strong> hostels
              </span>
              <span className="blocks__stat num">
                <strong>{boysHostels.length}</strong> Boys · <strong>{girlsHostels.length}</strong> Girls
              </span>
              <StatusIndicator status="operational" label="Direct Live" size="sm" />
            </>
          }
          actions={
            <button
              type="button"
              className="btn btn--primary hostel-btn--purple"
              onClick={() => setAddHostelOpen(true)}
            >
              <Plus size={16} aria-hidden="true" />
              + Add Hostel
            </button>
          }
        />

        {/* SECTION: BOYS HOSTELS */}
        <section className="hostel-section">
          <div className="sec-head">
            <div className="hostel-sec-title-row">
              <span className="hostel-sec-icon-pill boys">
                <Home size={15} />
              </span>
              <div>
                <h2 className="sec-head__title">Boys Hostels</h2>
                <p className="sec-head__sub">
                  6 accommodation complexes · Direct utility monitoring
                </p>
              </div>
            </div>
            <span className="num blocks__stat">
              <strong>{boysHostels.length}</strong> units active
            </span>
          </div>

          <div className="hostel__grid">
            {boysHostels.map((hostel, i) => (
              <HostelCard key={hostel.code} hostel={hostel} index={i} />
            ))}
          </div>
        </section>

        {/* SECTION: GIRLS HOSTELS */}
        <section className="hostel-section">
          <div className="sec-head">
            <div className="hostel-sec-title-row">
              <span className="hostel-sec-icon-pill girls">
                <Home size={15} />
              </span>
              <div>
                <h2 className="sec-head__title">Girls Hostels</h2>
                <p className="sec-head__sub">
                  7 accommodation complexes · Direct utility monitoring
                </p>
              </div>
            </div>
            <span className="num blocks__stat">
              <strong>{girlsHostels.length}</strong> units active
            </span>
          </div>

          <div className="hostel__grid">
            {girlsHostels.map((hostel, i) => (
              <HostelCard key={hostel.code} hostel={hostel} index={i + 6} />
            ))}
          </div>
        </section>

        <AddHostelModal
          open={addHostelOpen}
          onClose={() => setAddHostelOpen(false)}
          onCreate={handleCreateHostel}
        />
      </div>
    );
  }

  /* ========================================================================
     VIEW 1: MAIN BLOCKS PAGE (/blocks)
     ======================================================================== */
  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Estate Infrastructure"
        title="Blocks"
        meta={
          <>
            <div className="blocks__brand-badge">
              <Logo size="xs" />
              <span className="eyebrow eyebrow-accent">AIMDS Estate Topology</span>
            </div>
            <span className="blocks__stat num">
              <strong>{blocks.length}</strong> total facilities
            </span>
            <span className="blocks__stat num">
              <strong>{stats.sensorCount}</strong> telemetry sensors
            </span>
            <StatusIndicator status="operational" label="Operational" size="sm" />
          </>
        }
        actions={
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setChoiceOpen(true)}
          >
            <Plus size={16} aria-hidden="true" />
            Add
          </button>
        }
      />

      {/* 2 Main Categories Cards */}
      <div className="blocks__categories-grid">
        {/* Category 1: Academics */}
        <motion.div
          className="b-cat-card b-cat-card--academics"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/blocks/academics"
            className="b-cat-card__overlay"
            aria-label="Explore Academics blocks"
          />

          <div className="b-cat-card__head">
            <div className="b-cat-card__icon-box academics">
              <Building2 size={32} />
            </div>
            <div className="b-cat-card__badges">
              <span className="b-cat-pill academics">🏢 Academics</span>
              <StatusIndicator status="operational" size="sm" />
            </div>
          </div>

          <div className="b-cat-card__body">
            <h2 className="b-cat-card__title">Academics</h2>
            <p className="b-cat-card__desc">
              Six academic blocks featuring lecture hall complexes, laboratories,
              and floor-level telemetry. Individual floor slabs are clickable for detailed SCADA views.
            </p>

            <div className="b-cat-card__blocks-list">
              {['Learning Center (4F)', 'IB (3F)', 'AS (3F)', 'SF (4F)', 'Mech (4F)', 'Research Park (3F)'].map((name) => (
                <span key={name} className="b-cat-tag">
                  {name}
                </span>
              ))}
            </div>

            <div className="b-cat-card__stats-grid">
              <div className="b-cat-card__stat">
                <span className="b-cat-card__stat-label">
                  <Building2 size={12} /> Blocks
                </span>
                <span className="b-cat-card__stat-val num">6 Academic</span>
              </div>
              <div className="b-cat-card__stat">
                <span className="b-cat-card__stat-label">
                  <Layers size={12} /> Floors
                </span>
                <span className="b-cat-card__stat-val num">{academicFloors} Floors</span>
              </div>
              <div className="b-cat-card__stat">
                <span className="b-cat-card__stat-label">
                  <Gauge size={12} /> Current Load
                </span>
                <span className="b-cat-card__stat-val num">{formatNumber(academicPower)} kW</span>
              </div>
              <div className="b-cat-card__stat">
                <span className="b-cat-card__stat-label">
                  <Droplets size={12} /> Water Today
                </span>
                <span className="b-cat-card__stat-val num">{formatNumber(academicWater)} L</span>
              </div>
            </div>
          </div>

          <div className="b-cat-card__foot academics">
            <span className="b-cat-card__cta">
              Explore Academic Blocks
              <ArrowRight size={16} className="b-cat-card__arrow" aria-hidden="true" />
            </span>
          </div>
        </motion.div>

        {/* Category 2: Hostel */}
        <motion.div
          className="b-cat-card b-cat-card--hostel"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/blocks/hostel"
            className="b-cat-card__overlay"
            aria-label="Explore Hostel accommodations"
          />

          <div className="b-cat-card__head">
            <div className="b-cat-card__icon-box hostel">
              <Home size={32} />
            </div>
            <div className="b-cat-card__badges">
              <span className="b-cat-pill hostel">🛏️ Hostel</span>
              <StatusIndicator status="operational" size="sm" />
            </div>
          </div>

          <div className="b-cat-card__body">
            <h2 className="b-cat-card__title">Hostel</h2>
            <p className="b-cat-card__desc">
              Campus student residential accommodations with direct mains incomer telemetry.
              Boys and Girls hostels with bulk water flow and direct power monitoring (No floor divisions).
            </p>

            <div className="b-cat-card__blocks-list">
              {[
                'Sapphire',
                'Emerald',
                'Ruby',
                'Diamond',
                'Coral',
                'Pearl',
                'Ganga',
                'Yamuna',
                'Narmadha',
                'Cauvery',
                'Bhavani Wings',
              ].map((name) => (
                <span key={name} className="b-cat-tag hostel-tag">
                  {name}
                </span>
              ))}
            </div>

            <div className="b-cat-card__stats-grid">
              <div className="b-cat-card__stat">
                <span className="b-cat-card__stat-label">
                  <Home size={12} /> Hostels
                </span>
                <span className="b-cat-card__stat-val num">13 Residences</span>
              </div>
              <div className="b-cat-card__stat">
                <span className="b-cat-card__stat-label">
                  <Radio size={12} /> Structure
                </span>
                <span className="b-cat-card__stat-val num">Direct Units</span>
              </div>
              <div className="b-cat-card__stat">
                <span className="b-cat-card__stat-label">
                  <Gauge size={12} /> Current Load
                </span>
                <span className="b-cat-card__stat-val num">{formatNumber(hostelPower)} kW</span>
              </div>
              <div className="b-cat-card__stat">
                <span className="b-cat-card__stat-label">
                  <Droplets size={12} /> Water Today
                </span>
                <span className="b-cat-card__stat-val num">{formatNumber(hostelWater)} L</span>
              </div>
            </div>
          </div>

          <div className="b-cat-card__foot hostel">
            <span className="b-cat-card__cta hostel-cta">
              Explore Hostels
              <ArrowRight size={16} className="b-cat-card__arrow" aria-hidden="true" />
            </span>
          </div>
        </motion.div>
      </div>

      {/* Choice Modal for top-right "Add" button */}
      <AddChoiceModal
        open={choiceOpen}
        onClose={() => setChoiceOpen(false)}
        onSelectAcademic={() => setAddBlockOpen(true)}
        onSelectHostel={() => setAddHostelOpen(true)}
      />

      {/* Add Academic Block Modal */}
      <AddBlockModal
        open={addBlockOpen}
        onClose={() => setAddBlockOpen(false)}
        onCreate={handleCreateBlock}
        existingCodes={blocks.map((b) => b.code)}
      />

      {/* Add Hostel Modal */}
      <AddHostelModal
        open={addHostelOpen}
        onClose={() => setAddHostelOpen(false)}
        onCreate={handleCreateHostel}
      />
    </div>
  );
}
