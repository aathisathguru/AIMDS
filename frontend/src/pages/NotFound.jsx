import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import './NotFound.css';

export default function NotFound() {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <div className="not-found__mark" aria-hidden="true">
        <Compass size={30} strokeWidth={1.5} />
        <span>404</span>
      </div>
      <p className="not-found__eyebrow">AIMDS / navigation boundary</p>
      <h1 id="not-found-title">This monitoring surface is unavailable.</h1>
      <p className="not-found__copy">
        The address does not match an active AIMDS console route. Return to the operations dashboard
        or use the navigation rail to open a monitored surface.
      </p>
      <Link to="/" className="btn btn--primary">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to dashboard
      </Link>
    </section>
  );
}
