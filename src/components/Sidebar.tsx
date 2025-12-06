import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';
import { 
  Home, 
  ShoppingBag, 
  FileText, 
  Target,
  Search,
  Clock,
  ShoppingCart,
  DollarSign,
  Wallet,
  MessageSquare,
  Bell,
  LogIn,
  UserPlus,
  User,
  HelpCircle,
  Lock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUnifiedChat } from '../hooks/useUnifiedChat';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCounts } = useUnifiedChat();
  const [hasNewMessages, setHasNewMessages] = useState(false);
  
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (isOpen && window.innerWidth < 1024) {
      document.body.classList.add('sidebar-open');
      
      const scrollY = window.scrollY;
      document.body.style.top = `-${scrollY}px`;
    } else {
      document.body.classList.remove('sidebar-open');
      
      const scrollY = document.body.style.top;
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    return () => {
      document.body.classList.remove('sidebar-open');
      document.body.style.top = '';
    };
  }, [isOpen]);

  
  useEffect(() => {
    const glb = window as any;
    const prev = glb.__appNavigate;
    glb.__appNavigate = (path: string) => {
      try {
        navigate(path);
        window.scrollTo(0, 0);
        if (window.innerWidth < 1024) onToggle();
      } catch {
        try { window.location.assign(path); } catch {}
      }
    };
    return () => { glb.__appNavigate = prev; };
  }, [navigate, onToggle]);

  
  useEffect(() => {
    if (location.pathname === '/messages') {
      
      setHasNewMessages(false);
      return;
    }

    
    let totalUnread = 0;
    unreadCounts.forEach((count) => {
      totalUnread += count;
    });

    
    setHasNewMessages(totalUnread > 0);
  }, [unreadCounts, location.pathname]);

  
  useEffect(() => {
    const onNewMessage = () => {
      if (location.pathname !== '/messages') {
        setHasNewMessages(true);
      }
    };
    window.addEventListener('unified-chat-new-message', onNewMessage as EventListener);
    return () => {
      window.removeEventListener('unified-chat-new-message', onNewMessage as EventListener);
    };
  }, [location.pathname]);

  const menuSections = [
    {
      title: 'Navegação Principal',
      items: [
        { id: 'home', label: 'Página Inicial', icon: Home, path: '/' },
        { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, path: '/marketplace' },
        { id: 'my-posts', label: 'Minhas Publicações', icon: FileText, path: '/my-posts' },
      ]
    },
    {
      title: 'Boosting',
      items: [
        { id: 'my-boostings', label: 'Meus Boostings', icon: Target, path: '/my-boostings' },
        { id: 'browse-boostings', label: 'Seja Um Booster', icon: Search, path: '/browse-boostings' },
      ]
    },
    {
      title: 'Pedidos',
      items: [
        { id: 'open-orders', label: 'Pedidos em aberto', icon: Clock, path: '/open-orders' },
        { id: 'purchases', label: 'Compras', icon: ShoppingCart, path: '/purchases' },
        { id: 'sales', label: 'Vendas', icon: DollarSign, path: '/sales' },
        { id: 'account-deliveries', label: 'Contas Compradas', icon: Lock, path: '/account-deliveries' },
      ]
    },
    {
      title: 'Geral',
      items: [
        { id: 'wallet', label: 'Carteira', icon: Wallet, path: '/wallet' },
        { id: 'messages', label: 'Mensagens', icon: MessageSquare, path: '/messages' },
        { id: 'notifications', label: 'Notificações', icon: Bell, path: '/notifications' },
      ]
    },
    {
      title: 'Conta',
      items: user ? [
        { id: 'account', label: 'Minha Conta', icon: User, path: '/account' }
      ] : [
        { id: 'login', label: 'Login', icon: LogIn, path: '/login' },
        { id: 'register', label: 'Registro', icon: UserPlus, path: '/register' }
      ]
    }
  ];

  return (
    <>
      {}
      {isOpen && (
        <div 
          className="sidebar-backdrop fixed inset-0 bg-black bg-opacity-50 z-[9997] lg:hidden transition-opacity duration-300"
          onClick={onToggle}
        />
      )}
      
      {}
      <div className={`
        sidebar-fixed left-0 top-0 bg-gray-900 border-r border-gray-800 z-[9998]
        transform transition-transform duration-300 ease-in-out
        w-72 lg:translate-x-0 lg:z-30
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800
      `}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="relative text-2xl font-bold">
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Zenith</span>
              <span aria-hidden className="absolute inset-0 pointer-events-none select-none shiny-text mix-blend-screen opacity-70">Zenith</span>
            </h1>
          </div>
          
          <nav className="space-y-8">
            {menuSections.map((section) => (
              <div key={section.title} className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <LayoutGroup id="sidebarNav">
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    
                    return (
                      <li key={item.id}>
                        <motion.button
                          onClick={() => {
                            navigate(item.path);

                            window.scrollTo(0, 0);

                            if (window.innerWidth < 1024) onToggle();
                            if (item.id === 'messages') setHasNewMessages(false);
                          }}
                          className={`
                            relative w-full flex items-center px-3 py-2.5 rounded-lg transition-colors duration-200
                            text-sm font-medium group
                            ${isActive 
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25' 
                              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            }
                          `}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.6 }}
                          style={{ willChange: 'transform' }}
                          >
                          <AnimatePresence>
                            {isActive && (
                              <motion.div
                                key="activeIndicator"
                                layoutId="activeIndicator"
                                className="absolute left-0 inset-y-1 w-[3px] rounded-r-lg bg-gradient-to-b from-white/90 via-white/50 to-transparent shadow-[0_0_10px_rgba(255,255,255,0.25)]"
                                transition={{ type: 'spring', stiffness: 480, damping: 32, mass: 0.55 }}
                              />
                            )}
                          </AnimatePresence>
                          <Icon className={`
                            w-5 h-5 mr-3 transition-transform duration-200 group-hover:scale-110
                            ${isActive ? 'text-white' : 'text-gray-400'}
                          `} />
                          <span className="flex items-center">
                            {item.label}
                            {item.id === 'messages' && hasNewMessages && !isActive && (
                              <span className="ml-2 relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                              </span>
                            )}
                          </span>
                        </motion.button>
                      </li>
                    );
                  })}
                </ul>
                </LayoutGroup>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;