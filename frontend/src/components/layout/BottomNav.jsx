import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, FilePlus, AlertTriangle, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import './BottomNav.css';

const mobileNavItems = [
  { path: '/', icon: Activity, label: 'Overview' },
  { path: '/report', icon: FilePlus, label: 'Report' },
  { path: '/incidents', icon: AlertTriangle, label: 'Reports' },
  { path: '/install', icon: Download, label: 'Install' },
];

/**
 * Bottom navigation bar visible only on mobile screens.
 * Provides quick access to the most-used staff features.
 */
export function BottomNav() {
  const { user } = useAuth();
  const { t } = useTranslation();
  if (!user) return null;

  return (
    <nav className="bottom-nav">
      {mobileNavItems.map(({ path, icon: Icon, label }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <Icon size={20} />
          <span>{t(`nav.${label}`)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
