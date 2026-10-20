import {
  Activity,
  Bell,
  Boxes,
  Brain,
  ChartSpline,
  FileText,
  LayoutDashboard,
  Radio,
  Settings,
} from 'lucide-react';

/** Single source of truth for routing + navigation labels. */
export const NAV_GROUPS = [
  {
    id: 'monitor',
    label: 'Monitor',
    items: [
      { id: 'dashboard', to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { id: 'blocks', to: '/blocks', label: 'Blocks', icon: Boxes },
      { id: 'live', to: '/live', label: 'Live monitoring', icon: Activity },
      { id: 'sensors', to: '/sensors', label: 'Sensors', icon: Radio },
    ],
  },
  {
    id: 'analyze',
    label: 'Analyze',
    items: [
      { id: 'analytics', to: '/analytics', label: 'Analytics', icon: ChartSpline },
      { id: 'insights', to: '/insights', label: 'AI insights', icon: Brain },
      { id: 'alerts', to: '/alerts', label: 'Alerts', icon: Bell, badge: 'alerts' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'reports', to: '/reports', label: 'Reports', icon: FileText },
      { id: 'settings', to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

/** Five-slot bottom bar — the primary navigation on phones. */
export const MOBILE_NAV = [
  { id: 'dashboard', to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { id: 'blocks', to: '/blocks', label: 'Blocks', icon: Boxes },
  { id: 'live', to: '/live', label: 'Monitoring', icon: Activity },
  { id: 'alerts', to: '/alerts', label: 'Alerts', icon: Bell, badge: 'alerts' },
  { id: 'more', to: '/more', label: 'More', icon: null },
];

export const PAGE_TITLES = {
  '/': 'Dashboard',
  '/blocks': 'Blocks',
  '/live': 'Live monitoring',
  '/sensors': 'Sensors',
  '/analytics': 'Analytics',
  '/insights': 'AI insights',
  '/alerts': 'Alerts',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/more': 'More',
};
