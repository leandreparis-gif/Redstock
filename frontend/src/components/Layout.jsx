import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { IconMenu, IconAlerte } from './Icons';
import { useAlertes } from '../hooks/useAlertes';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { alertesActives } = useAlertes();
  const { user } = useAuth();
  const totalAlertes = alertesActives.length;
  const initiale = user?.prenom?.[0]?.toUpperCase() || '?';

  return (
    <div className="flex h-screen bg-crf-fond overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between gap-4 px-6 py-3.5
                           bg-white border-b border-gray-100 flex-shrink-0">
          {/* Burger mobile */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-crf-rouge transition-colors"
            aria-label="Menu"
          >
            <IconMenu size={22} />
          </button>

          <div className="flex-1" />

          {/* Cloche alertes */}
          <div className="relative">
            <button className="w-9 h-9 flex items-center justify-center rounded-full
                               hover:bg-gray-100 text-gray-400 hover:text-crf-rouge transition-colors">
              <IconAlerte size={20} />
            </button>
            {totalAlertes > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-crf-rouge rounded-full
                               text-white text-[9px] font-bold flex items-center justify-center">
                {totalAlertes > 9 ? '9+' : totalAlertes}
              </span>
            )}
          </div>

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-crf-rouge flex items-center justify-center
                          text-white text-sm font-bold flex-shrink-0 cursor-pointer">
            {initiale}
          </div>
        </header>

        {/* Contenu */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
