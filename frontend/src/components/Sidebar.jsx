import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlertes } from '../hooks/useAlertes';
import LogoCRF from './LogoCRF';
import {
  IconDashboard, IconArmoire, IconSac, IconUniforme,
  IconReporting, IconAdmin, IconLogout,
} from './Icons';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Tableau de bord',    Icon: IconDashboard },
  { to: '/armoires',  label: 'Armoires & Tiroirs', Icon: IconArmoire, alertKey: true },
  { to: '/lots',      label: 'Lots & Sacs',        Icon: IconSac },
  { to: '/uniformes', label: 'Uniformes',          Icon: IconUniforme },
  { to: '/reporting', label: 'Reporting',          Icon: IconReporting },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const { countPeremption, countStockBas } = useAlertes();
  const navigate = useNavigate();

  const totalAlertes = countPeremption + countStockBas;
  const items = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ to: '/admin', label: 'Administration', Icon: IconAdmin }] : []),
  ];

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };
  const initiale = user?.prenom?.[0]?.toUpperCase() || '?';

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />}

      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-sidebar flex flex-col
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center px-5 py-5 border-b border-gray-100 flex-shrink-0">
          <LogoCRF height={44} />
        </div>

        {/* Unité locale */}
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Unité Locale</p>
          <p className="text-xs font-semibold text-crf-texte mt-0.5 truncate">
            {user?.unite_locale_nom || 'Versailles Grand Parc Ouest'}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {items.map(({ to, label, Icon, alertKey }) => {
            const badge = alertKey ? totalAlertes : 0;
            return (
              <NavLink key={to} to={to} onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                   transition-all duration-150 ${
                    isActive
                      ? 'bg-crf-rouge text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-crf-texte'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} className={`flex-shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-crf-rouge'
                    }`} />
                    <span className="flex-1 truncate">{label}</span>
                    {badge > 0 && (
                      <span className={`flex-shrink-0 inline-flex items-center justify-center
                        min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold
                        ${isActive ? 'bg-white text-crf-rouge' : 'bg-crf-rouge text-white'}`}>
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Profil */}
        <div className="border-t border-gray-100 px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-crf-rouge flex items-center justify-center
                            flex-shrink-0 text-white text-sm font-bold">{initiale}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-crf-texte truncate">{user?.prenom}</p>
              <p className="text-xs text-gray-400 truncate">
                {user?.qualification} · {user?.role === 'ADMIN' ? 'Admin' : 'Contrôleur'}
              </p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 w-full text-xs text-gray-400 hover:text-crf-rouge transition-colors px-1">
            <IconLogout size={14} />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
