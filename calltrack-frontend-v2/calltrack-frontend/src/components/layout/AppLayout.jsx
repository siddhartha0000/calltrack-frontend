import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { initials } from '../../lib/utils';

const NAV = [
  { to: '/',          icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { to: '/leads',     icon: 'ti-users',             label: 'Leads' },
  { to: '/followups', icon: 'ti-calendar-event',    label: 'Follow-ups' },
  { to: '/calls',     icon: 'ti-phone',             label: 'Call log' },
  { to: '/whatsapp',  icon: 'ti-brand-whatsapp',    label: 'WhatsApp' },
];
const NAV_ADMIN = [
  { to: '/import',    icon: 'ti-file-import',       label: 'Import leads' },
  { to: '/reports',   icon: 'ti-chart-bar',          label: 'Reports' },
  { to: '/agents',    icon: 'ti-building-community', label: 'Agents' },
  { to: '/settings',  icon: 'ti-settings',           label: 'Settings' },
];
const MOB_NAV = [
  { to: '/',          icon: 'ti-layout-dashboard', label: 'Home' },
  { to: '/leads',     icon: 'ti-users',             label: 'Leads' },
  { to: '/followups', icon: 'ti-calendar-event',    label: 'Follow-ups' },
  { to: '/calls',     icon: 'ti-phone',             label: 'Calls' },
  { to: '/reports',   icon: 'ti-chart-bar',          label: 'Reports' },
];

export function AppLayout({ children, title, onSearch, onAddLead }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="name">CallTrack CRM</div>
          <div className="tagline">Telecalling · Admissions · Sales</div>
        </div>
        <div className="sidebar-user">
          <div className="av" style={{ background: '#2563EB', color: '#fff', width: 32, height: 32, fontSize: 12 }}>
            {initials(user?.name || 'U')}
          </div>
          <div>
            <div className="uname">{user?.name}</div>
            <div className="urole">{user?.role === 'admin' ? 'Administrator' : 'Agent'}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">Main</div>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <i className={`ti ${item.icon}`} />
              {item.label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <>
              <div className="nav-section">Manage</div>
              {NAV_ADMIN.map(item => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={() => setSidebarOpen(false)}>
                  <i className={`ti ${item.icon}`} />
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={handleLogout}>
            <i className="ti ti-logout" style={{ fontSize: 18 }} /> Sign out
          </button>
        </div>
      </div>

      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Main */}
      <div className="main">
        <div className="topbar">
          <div className="mob-menu-btn" onClick={() => setSidebarOpen(true)}>
            <i className="ti ti-menu-2" />
          </div>
          <div className="page-title">{title}</div>
          {onSearch && (
            <div className="topbar-search">
              <i className="ti ti-search" />
              <input type="text" placeholder="Search leads…" onChange={e => onSearch(e.target.value)} />
            </div>
          )}
          {onAddLead && (
            <button className="topbar-btn" onClick={onAddLead} title="Add lead">
              <i className="ti ti-plus" />
            </button>
          )}
          <button className="topbar-btn"><i className="ti ti-bell" /></button>
        </div>

        <div className="page-content">{children}</div>
      </div>

      {/* Mobile nav */}
      <nav className="mob-nav">
        <div className="mob-nav-inner">
          {MOB_NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `mob-nav-btn${isActive ? ' active' : ''}`}>
              <i className={`ti ${item.icon}`} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
