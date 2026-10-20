import { Link } from 'react-router-dom';
import { ChevronRight, Boxes } from 'lucide-react';
import './BlocksBreadcrumb.css';

/**
 * Clickable breadcrumbs for Blocks hierarchy:
 * Blocks > Academics
 * Blocks > Academics > Learning Center
 * Blocks > Academics > Learning Center > Ground Floor (G)
 * Blocks > Hostel
 * Blocks > Hostel > Sapphire
 */
export default function BlocksBreadcrumb({ items = [] }) {
  return (
    <nav className="b-crumb-nav" aria-label="Blocks navigation breadcrumb">
      <ol className="b-crumb-list">
        <li className="b-crumb-item">
          <Link to="/blocks" className="b-crumb-link">
            <Boxes size={14} className="b-crumb-icon" aria-hidden="true" />
            <span>Blocks</span>
          </Link>
        </li>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const Icon = item.icon;
          return (
            <li key={item.label || idx} className="b-crumb-item">
              <ChevronRight size={13} className="b-crumb-sep" aria-hidden="true" />
              {isLast || !item.to ? (
                <span className="b-crumb-current" aria-current="page">
                  {Icon && <Icon size={13} className="b-crumb-icon" aria-hidden="true" />}
                  <span>{item.label}</span>
                </span>
              ) : (
                <Link to={item.to} className="b-crumb-link">
                  {Icon && <Icon size={13} className="b-crumb-icon" aria-hidden="true" />}
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
