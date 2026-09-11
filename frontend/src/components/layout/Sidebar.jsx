import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Map, Route, AlertTriangle, Truck, Building2, Settings, FilePlus, BarChart3, Download, X, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import './Sidebar.css';

const navItems = [
  { path: '/', icon: Activity, label: 'Overview', roles: ['public', 'driver', 'command'] },
  { path: '/gis', icon: Map, label: 'GIS Intelligence', roles: ['command'] },
  { path: '/report', icon: FilePlus, label: 'New Report', roles: ['public', 'driver', 'command'] },
  { path: '/incidents', icon: AlertTriangle, label: 'Field Reports', roles: ['public', 'driver', 'command'] },
  { path: '/omniroute', icon: Route, label: 'OmniRoute', roles: ['driver', 'command'] },
  { path: '/fleet', icon: Truck, label: 'Fleet Tracking', roles: ['command'] },
  { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['command'] },
  { path: '/district', icon: Building2, label: 'District Admin', roles: ['command'] },
  { path: '/install', icon: Download, label: 'Install App', roles: ['public', 'driver', 'command'] },
];

export function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') !== 'light';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.user_type));

  return (
    <aside className={`sidebar glass-panel ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <h1 className="logo-text">NER<span className="text-glow">VA</span></h1>
        <p className="subtitle">Intelligence Platform</p>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} className="nav-icon" />
            <span>{t(`nav.${item.label}`)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button 
          onClick={toggleTheme} 
          className="theme-toggle-btn" 
          aria-label="Toggle theme"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.5rem', width: '100%', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-panel-hover)', color: 'var(--text-primary)' }}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          <span>{isDark ? t('theme.Light Mode') : t('theme.Dark Mode')}</span>
        </button>
        <button 
          onClick={logout} 
          className="theme-toggle-btn" 
          aria-label="Logout"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.5rem', width: '100%', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-panel-hover)', color: 'var(--text-primary)' }}
        >
          <LogOut size={18} />
          <span>{t('auth.Logout', 'Log Out')}</span>
        </button>
        <div className="sidebar-version">
          <span className="version-dot"></span>
          v1.0.0 — SIH 2026
        </div>
      </div>
    </aside>
  );
}

