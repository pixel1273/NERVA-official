import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, FilePlus, AlertTriangle, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
