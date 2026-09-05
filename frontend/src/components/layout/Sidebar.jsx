import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Map, Route, AlertTriangle, Truck, Building2, Settings, FilePlus, BarChart3, Download, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const navItems = [
  { path: '/', icon: Activity, label: 'Overview', roles: ['role_ground_staff', 'role_district_admin', 'role_central_command'] },
  { path: '/report', icon: FilePlus, label: 'New Report', roles: ['role_ground_staff', 'role_district_admin', 'role_central_command'] },
  { path: '/incidents', icon: AlertTriangle, label: 'Field Reports', roles: ['role_ground_staff', 'role_district_admin', 'role_central_command'] },
  { path: '/omniroute', icon: Route, label: 'OmniRoute', roles: ['role_district_admin', 'role_central_command'] },
  { path: '/fleet', icon: Truck, label: 'Fleet Tracking', roles: ['role_central_command'] },
  { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['role_district_admin', 'role_central_command'] },
  { path: '/district', icon: Building2, label: 'District Admin', roles: ['role_district_admin', 'role_central_command'] },
  { path: '/install', icon: Download, label: 'Install App', roles: ['role_ground_staff', 'role_district_admin', 'role_central_command'] },
];

export function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const userRole = user?.role;

  const filteredNavItems = navItems.filter(item =>
    !item.roles || item.roles.includes(userRole)
  );

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
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-version">
          <span className="version-dot"></span>
          v1.0.0 — SIH 2026
        </div>
      </div>
    </aside>
  );
}

