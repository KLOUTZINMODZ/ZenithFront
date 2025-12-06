import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import SupportWidget from './support/SupportWidget';
import TermsWidget from './terms/TermsWidget';
import QuickActionMenu from './QuickActionMenu';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  

  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />

      <div className="flex-1 flex flex-col ml-0 lg:ml-72 min-h-0">
        <Header onMenuToggle={toggleSidebar} />
        
        <main className="flex-1 min-h-0 p-4 lg:p-6 overflow-x-hidden content-container">
          <div className="max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        
        {/* Support Widget (mantém para funcionalidade interna) */}
        <SupportWidget />
        <TermsWidget />

        {/* Quick Action Menu (novo menu compacto) */}
        <QuickActionMenu />
      </div>
    </div>
  );
};

export default Layout;