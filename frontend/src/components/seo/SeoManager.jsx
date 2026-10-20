import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'AIMDS';
const DEFAULT_DESCRIPTION =
  'AIMDS is an AI-assisted multi-utility monitoring and decision support console for reliable campus operations.';
const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '');
const SOCIAL_IMAGE = '/aimds-social-card.svg';

const ROUTE_META = {
  '/login': {
    title: 'Sign in to AIMDS | Multi-Utility Monitoring',
    description: 'Secure operator access to AIMDS multi-utility monitoring, alerts, analytics, and decision support.',
    robots: 'noindex, nofollow',
    breadcrumb: 'Sign in',
  },
  '/signup': {
    title: 'Create an AIMDS account | Operations Console',
    description: 'Create an authorized AIMDS operator account for multi-utility monitoring and decision support.',
    robots: 'noindex, nofollow',
    breadcrumb: 'Create account',
  },
  '/': {
    title: 'Operations dashboard | AIMDS',
    description: 'Monitor campus electricity, water, environmental conditions, alerts, and AI-assisted operational insights.',
    robots: 'noindex, nofollow',
    breadcrumb: 'Dashboard',
  },
  '/blocks': {
    title: 'Monitored blocks | AIMDS',
    description: 'Review monitored academic and residential blocks, floors, utility coverage, and current operational status.',
    robots: 'noindex, nofollow',
    breadcrumb: 'Blocks',
  },
  '/live': {
    title: 'Live telemetry monitoring | AIMDS',
    description: 'Review live ESP32 telemetry, connection health, power readings, and recent device activity.',
    robots: 'noindex, nofollow',
    breadcrumb: 'Live monitoring',
  },
  '/sensors': {
    title: 'Sensor registry | AIMDS',
    description: 'Inspect provisioned utility sensors, readings, signal health, and monitoring coverage.',
    robots: 'noindex, nofollow',
    breadcrumb: 'Sensors',
  },
  '/analytics': {
    title: 'Utility analytics | AIMDS',
    description: 'Analyze utility trends, expected ranges, deviations, and evidence behind operational decisions.',
    robots: 'noindex, nofollow',
    breadcrumb: 'Analytics',
  },
  '/insights': {
    title: 'AI operational insights | AIMDS',
    description: 'Review structured AIMDS findings with severity, evidence, likely causes, and recommended actions.',
    robots: 'noindex, nofollow',
    breadcrumb: 'AI insights',
  },
  '/alerts': {
    title: 'Operational alerts | AIMDS',
    description: 'Review critical, warning, informational, and resolved utility alerts across monitored locations.',
    robots: 'noindex, nofollow',
    breadcrumb: 'Alerts',
  },
  '/reports': {
    title: 'Monitoring reports | AIMDS',
    description: 'Compose and review monitoring reports for utility performance, telemetry, and operational events.',
    robots: 'noindex, nofollow',
    breadcrumb: 'Reports',
  },
  '/settings': {
    title: 'AIMDS settings | Operations console',
    description: 'Configure AIMDS profile, notifications, thresholds, appearance, and backend connectivity.',
    robots: 'noindex, nofollow',
    breadcrumb: 'Settings',
  },
  '/more': {
    title: 'AIMDS navigation | Operations console',
    description: 'Access additional AIMDS monitoring and operations console destinations.',
    robots: 'noindex, nofollow',
    breadcrumb: 'More',
  },
};

function upsertMeta(attribute, key, content) {
  if (!content) return;
  let node = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attribute, key);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let node = document.head.querySelector(`link[rel="${rel}"]`);
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', rel);
    document.head.appendChild(node);
  }
  node.setAttribute('href', href);
}

function upsertJsonLd(id, value) {
  let node = document.head.querySelector(`script[data-seo="${id}"]`);
  if (!node) {
    node = document.createElement('script');
    node.type = 'application/ld+json';
    node.dataset.seo = id;
    document.head.appendChild(node);
  }
  node.textContent = JSON.stringify(value);
}

function removeJsonLd(id) {
  document.head.querySelector(`script[data-seo="${id}"]`)?.remove();
}

function getMeta(pathname) {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  if (/^\/blocks\/[^/]+\/floors\/[^/]+$/.test(pathname)) {
    return {
      title: 'Floor monitoring | AIMDS',
      description: 'Review floor-level utility readings, sensor status, expected ranges, and operational evidence.',
      robots: 'noindex, nofollow',
      breadcrumb: 'Floor monitoring',
    };
  }
  if (/^\/blocks\/[^/]+$/.test(pathname)) {
    return {
      title: 'Block monitoring | AIMDS',
      description: 'Review block-level utility performance, floors, sensor coverage, and current status.',
      robots: 'noindex, nofollow',
      breadcrumb: 'Block monitoring',
    };
  }
  if (pathname.startsWith('/blocks/')) {
    return {
      title: 'Monitoring location | AIMDS',
      description: 'Review utility monitoring details for this AIMDS location.',
      robots: 'noindex, nofollow',
      breadcrumb: 'Location',
    };
  }
  return {
    title: 'Page not found | AIMDS',
    description: 'The requested AIMDS page could not be found.',
    robots: 'noindex, nofollow',
    breadcrumb: 'Not found',
  };
}

export default function SeoManager() {
  const location = useLocation();
  const meta = getMeta(location.pathname);
  const canonical = SITE_URL ? `${SITE_URL}${location.pathname === '/' ? '/' : location.pathname}` : '';
  const pageUrl = canonical || undefined;

  useEffect(() => {
    document.title = meta.title;
    upsertMeta('name', 'description', meta.description || DEFAULT_DESCRIPTION);
    upsertMeta('name', 'robots', meta.robots);
    upsertMeta('name', 'theme-color', '#090D16');
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:title', meta.title);
    upsertMeta('property', 'og:description', meta.description || DEFAULT_DESCRIPTION);
    upsertMeta('property', 'og:image', pageUrl ? `${SITE_URL}${SOCIAL_IMAGE}` : '');
    upsertMeta('property', 'og:image:alt', 'AIMDS multi-utility monitoring and decision support console');
    upsertMeta('property', 'og:url', pageUrl || '');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', meta.title);
    upsertMeta('name', 'twitter:description', meta.description || DEFAULT_DESCRIPTION);
    upsertMeta('name', 'twitter:image', pageUrl ? `${SITE_URL}${SOCIAL_IMAGE}` : '');
    upsertMeta('name', 'twitter:image:alt', 'AIMDS multi-utility monitoring and decision support console');
    upsertLink('canonical', pageUrl);

    if (pageUrl) {
      upsertJsonLd('breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'AIMDS', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: meta.breadcrumb, item: pageUrl },
        ],
      });
      upsertJsonLd('business', {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/aimds-logo.png`,
        image: `${SITE_URL}${SOCIAL_IMAGE}`,
        description: DEFAULT_DESCRIPTION,
      });
    } else {
      removeJsonLd('breadcrumb');
      removeJsonLd('business');
    }
  }, [meta, pageUrl]);

  return null;
}
