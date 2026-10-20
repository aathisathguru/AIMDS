import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, RadioTower, Timer, Wifi, WifiOff } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery.js';
import './ConnectionCard.css';

export default function ConnectionCard({ connection, activeSensors, lastUpdate }) {
  const reduced = usePrefersReducedMotion();
  const connected = connection.state === 'connected';
  const Icon = connected ? Wifi : WifiOff;
  const [uptimeSec, setUptimeSec] = useState(0);

  useEffect(() => {
    const compute = () => setUptimeSec(Math.max(0, Math.floor((Date.now() - connection.since) / 1000)));
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [connection.since]);

  const mm = String(Math.floor(uptimeSec / 60)).padStart(2, '0');
  const ss = String(uptimeSec % 60).padStart(2, '0');

  return (
    <section className={`conn ${connected ? 'is-live' : 'is-connecting'}`} aria-label="Stream connection">
      <div className="conn__head">
        <span className="conn__icon" aria-hidden="true">
          <Icon size={16} strokeWidth={2.1} />
          {connected && !reduced && <span className="conn__ring" />}
        </span>
        <div className="min0">
          <p className="conn__state">
            {connected ? 'Stream connected' : 'Establishing stream…'}
            {connected && !reduced && (
              <motion.span
                className="conn__live"
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                LIVE
              </motion.span>
            )}
          </p>
          <p className="conn__sub num">wss://api.aimds.io/v1/stream</p>
        </div>
      </div>

      <dl className="conn__grid">
        <div>
          <dt>
            <Timer size={11} aria-hidden="true" /> Latency
          </dt>
          <dd className="num">{connection.latency} ms</dd>
        </div>
        <div>
          <dt>
            <Activity size={11} aria-hidden="true" /> Packets
          </dt>
          <dd className="num">{connection.packets.toLocaleString('en-US')}</dd>
        </div>
        <div>
          <dt>
            <RadioTower size={11} aria-hidden="true" /> Sensors
          </dt>
          <dd className="num">{activeSensors}</dd>
        </div>
        <div>
          <dt>Session</dt>
          <dd className="num">
            {mm}:{ss}
          </dd>
        </div>
      </dl>

      <p className="conn__foot num">Last update · {lastUpdate}</p>
    </section>
  );
}
