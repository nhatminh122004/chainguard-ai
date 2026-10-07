'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Logo3D from '@/components/Logo3D/Logo3D';
import './Sidebar.css';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { id: 'chat', label: 'AI Advisor', href: '/chat', icon: '🤖' },
  { id: 'scanner', label: 'Receipt Scanner', href: '/scanner', icon: '📷' },
  { id: 'transactions', label: 'Transactions', href: '/transactions', icon: '💳' },
  { id: 'blockchain', label: 'Blockchain', href: '/blockchain', icon: '🔗', badge: 'On-chain' },
  { id: 'credit', label: 'Credit Score', href: '/credit', icon: '📈' },
  { id: 'report', label: 'AI Report', href: '/report', icon: '📄', badge: 'Gemini' },
  { id: 'fraud', label: 'Fraud Shield', href: '/fraud', icon: '🛡️' },
  { id: 'fake-bill', label: 'Fake Bill & QR', href: '/fake-bill', icon: '🔍', badge: 'Hot' },
];

const bottomItems: NavItem[] = [
  { id: 'settings', label: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile toggle */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <span className={`hamburger ${mobileOpen ? 'active' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <Logo3D size="md" href="/dashboard" showText={!collapsed} />
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
          >
            <span style={{ transform: collapsed ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.3s ease' }}>
              ◀
            </span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            {!collapsed && <span className="nav-section-label">MAIN MENU</span>}
            <ul className="nav-list">
              {navItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="nav-label">{item.label}</span>
                        {item.badge && (
                          <span className="nav-badge">{item.badge}</span>
                        )}
                      </>
                    )}
                    {isActive(item.href) && <div className="nav-active-indicator" />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="sidebar-bottom">
          <ul className="nav-list">
            {bottomItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>

          {/* User Profile */}
          {user && (
            <div className="sidebar-user">
              <div className="avatar">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user.displayName?.[0] || user.email?.[0] || 'U'
                )}
              </div>
              {!collapsed && (
                <div className="user-info">
                  <span className="user-name">{user.displayName || 'User'}</span>
                  <span className="user-email">{user.email}</span>
                </div>
              )}
              {!collapsed && (
                <button className="btn-ghost btn-icon" onClick={signOut} title="Đăng xuất">
                  🚪
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
