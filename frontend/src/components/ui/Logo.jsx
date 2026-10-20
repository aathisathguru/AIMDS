import aimdsLogo from '../../assets/aimds-logo.png';
import aimdsMark from '../../assets/aimds-mark.png';
import './Logo.css';

export default function Logo({
  size = 'md',
  showWordmark = true,
  tagline = false,
  className = '',
  alt = 'AIMDS - Multi-Utility Telemetry & Decision Support',
}) {
  const imgSrc = showWordmark ? aimdsLogo : aimdsMark;

  return (
    <span className={`logo logo--${size} ${className}`.trim()}>
      <span className="logo__frame">
        <img
          src={imgSrc}
          alt={alt}
          className="logo__image"
          loading="eager"
        />
      </span>
      {showWordmark && tagline && (
        <span className="logo__meta">
          <span className="logo__meta-title">AIMDS</span>
          <span className="logo__meta-tag">GRID TELEMETRY</span>
        </span>
      )}
    </span>
  );
}
