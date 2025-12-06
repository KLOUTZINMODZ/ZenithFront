import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Menu, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationBell from './NotificationBell';
import NotificationToastContainer from './ui/NotificationToastContainer';
import SearchDropdown from './SearchDropdown';
import './Header.css';

interface HeaderProps {
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null); 
  const searchRefMobile = useRef<HTMLDivElement>(null); 
  const userMenuRef = useRef<HTMLDivElement>(null); 
  const { user, logout } = useAuth();
  const { toasts, removeToast } = useNotifications();
  const navigate = useNavigate();


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideDesktop = !!(searchRef.current && searchRef.current.contains(target));
      const clickedInsideMobile = !!(searchRefMobile.current && searchRefMobile.current.contains(target));
      const clickedInsideUserMenu = !!(userMenuRef.current && userMenuRef.current.contains(target));
      
      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setIsSearchOpen(false);
      }
      
      if (!clickedInsideUserMenu) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  const handleSearchFocus = () => {
    setIsSearchOpen(true);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearchOpen(true);
    }
  };

  const handleUserClick = () => {
    if (user) {
      
      if (window.innerWidth < 768) {
        setIsUserMenuOpen(prev => !prev);
      } else {
        
        if (!isUserMenuOpen) {
          navigate('/account');
        }
      }
    } else {
      navigate('/login');
    }
  };
  
  const handleMenuItemClick = (action: () => void) => {
    action();
    setIsUserMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-3 sm:px-4 py-3 sm:py-4 lg:px-6 sticky top-0 z-40">
      <div className="flex items-center justify-between gap-2 sm:gap-4 lg:grid lg:grid-cols-[auto_1fr_auto]">
        {}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0 lg:flex-none">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 flex-shrink-0"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
          </button>

          {}
          <div ref={searchRefMobile} className="relative lg:hidden flex-1 min-w-0">
            <button
              type="button"
              onClick={handleSearchFocus}
              className="flex items-center justify-center gap-2 px-4 py-2.5 w-full bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-all duration-200"
            >
              <Search className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Buscar</span>
            </button>

            {}
            <SearchDropdown
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              onSubmit={handleSearch}
            />
          </div>
        </div>

        {}
        <div ref={searchRef} className="relative hidden lg:flex justify-center justify-self-center w-full">
          <div className="relative w-full lg:max-w-[500px] xl:max-w-[600px]">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Pesquisar jogos, skins, conta..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={handleSearchFocus}
                  className="
                    pl-4 pr-4 py-2 w-full
                    bg-gray-800 border border-gray-700 rounded-lg 
                    text-white placeholder-gray-400 text-sm sm:text-base
                    focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    transition-all duration-200
                    hover:border-gray-600
                  "
                />
              </div>
            </form>

            {}
            <SearchDropdown
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              onSubmit={handleSearch}
            />
          </div>
        </div>

        {}
        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 flex-shrink-0">
          <NotificationBell />
          
          <div ref={userMenuRef} className="relative group">
            <button 
              onClick={handleUserClick}
              onMouseEnter={() => window.innerWidth >= 768 && user && setIsUserMenuOpen(true)}
              className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 group"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                {(user?.profilePicture || user?.avatar) ? (
                  <img
                    src={user.profilePicture || user.avatar!}
                    alt={user.name || 'User'}
                    className="w-full h-full rounded-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.onerror = null;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=6b21a8&color=fff&size=128`;
                    }}
                  />
                ) : (
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                )}
              </div>
              <span className="text-gray-300 group-hover:text-white transition-colors duration-200 hidden sm:block text-sm sm:text-base truncate max-w-[100px] md:max-w-[150px]">
                {user ? user.name : 'Entrar'}
              </span>
            </button>
            
            {user && (
              <div 
                onMouseEnter={() => window.innerWidth >= 768 && setIsUserMenuOpen(true)}
                onMouseLeave={() => window.innerWidth >= 768 && setIsUserMenuOpen(false)}
                className={`user-dropdown absolute right-0 top-full mt-2 w-40 sm:w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl transition-all duration-200 z-50 ${
                  isUserMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
                }`}
              >
                <div className="p-1.5 sm:p-2">
                  <button
                    onClick={() => handleMenuItemClick(() => navigate('/account'))}
                    className="w-full text-left px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors duration-200"
                  >
                    Minha Conta
                  </button>
                  <button
                    onClick={() => handleMenuItemClick(handleLogout)}
                    className="w-full text-left px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors duration-200"
                  >
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {}
      <NotificationToastContainer 
        toasts={toasts} 
        removeToast={removeToast} 
      />
    </header>
  );
};

export default Header;