import { motion } from 'framer-motion';
import './PageHeader.css';

export default function PageHeader({ eyebrow, title, subtitle, actions, meta }) {
  return (
    <motion.header
      className="page-head"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="page-head__main min0">
        {eyebrow && <p className="eyebrow eyebrow-accent page-head__eyebrow">{eyebrow}</p>}
        <h1 className="page-head__title">{title}</h1>
        {subtitle && <p className="page-head__sub">{subtitle}</p>}
        {meta && <div className="page-head__meta">{meta}</div>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </motion.header>
  );
}
