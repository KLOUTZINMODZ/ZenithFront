import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, Gamepad2, Tag, ArrowUpDown, ChevronDown, Check, AlertCircle, CheckCircle, Clock, XCircle, RotateCcw, Sparkles } from 'lucide-react';
import translateCategoryLabel from '../../utils/categoryTranslations';

export type FilterModalValues = {
  category?: string;
  game?: string;
  sortBy?: 'recent' | 'popular' | 'price_asc' | 'price_desc';
  status?: string;
};

type FilterModalProps = {
  isOpen: boolean;
  title?: string;
  initial: FilterModalValues;
  categories?: string[]; 
  games?: string[]; 
  statuses?: string[]; 
  showGame?: boolean;
  showCategory?: boolean;
  showSort?: boolean;
  showStatus?: boolean;
  onApply: (values: FilterModalValues) => void;
  onClose: () => void;
};

type SortKey = 'recent' | 'popular' | 'price_asc' | 'price_desc';
const sortLabels: Record<SortKey, string> = {
  recent: 'Mais recentes',
  popular: 'Mais populares',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
};

const statusTranslations: Record<string, string> = {
  'all': 'Todos os status',
  'pending': 'Pendente',
  'in_progress': 'Em Progresso',
  'inProgress': 'Em Progresso',
  'in_Progress': 'Em Progresso',
  'completed': 'Concluído',
  'complete': 'Concluído',
  'cancelled': 'Cancelado',
  'canceled': 'Cancelado',
  'failed': 'Falhou',
  'waiting': 'Aguardando',
  'active': 'Ativo',
  'inactive': 'Inativo',
  'expired': 'Expirado',
  'processing': 'Processando',
  'approved': 'Aprovado',
  'rejected': 'Rejeitado',
  'on_hold': 'Em Espera',
  'onHold': 'Em Espera',
};

const translateStatus = (status: string): string => {
  if (!status) return status;
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  return statusTranslations[normalized] || statusTranslations[status] || status;
};

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, title = 'Filtros', initial, categories = [], games = [], statuses = [], showGame = true, showCategory = true, showSort = true, showStatus = false, onApply, onClose }) => {
  const hasStatuses = statuses && statuses.length > 0 && statuses.some(s => s !== 'all');
  const [category, setCategory] = useState<string>(initial.category ?? 'all');
  const [game, setGame] = useState<string>(initial.game ?? 'all');
  const [sortBy, setSortBy] = useState<FilterModalValues['sortBy']>(initial.sortBy ?? 'recent');
  const [status, setStatus] = useState<string>(initial.status ?? 'all');
  const [gameOpen, setGameOpen] = useState<boolean>(false);
  const gameRef = useRef<HTMLDivElement | null>(null);
  const [categoryOpen, setCategoryOpen] = useState<boolean>(false);
  const categoryRef = useRef<HTMLDivElement | null>(null);
  const [statusOpen, setStatusOpen] = useState<boolean>(false);
  const statusRef = useRef<HTMLDivElement | null>(null);

  
  useEffect(() => {
    if (!isOpen) return;
    setCategory(initial.category ?? 'all');
    setGame(initial.game ?? 'all');
    setSortBy(initial.sortBy ?? 'recent');
    setStatus(initial.status ?? 'all');
  }, [isOpen, initial.category, initial.game, initial.sortBy, initial.status]);

  
  useEffect(() => {
    if (!isOpen) return;
    try {
      document.documentElement.classList.add('modal-open');
      return () => {
        document.documentElement.classList.remove('modal-open');
      };
    } catch {}
  }, [isOpen]);

  
  useEffect(() => {
    if (!isOpen) {
      setGameOpen(false);
      setCategoryOpen(false);
      setStatusOpen(false);
    }
  }, [isOpen]);

  
  useEffect(() => {
    if (!gameOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!gameRef.current) return;
      if (!gameRef.current.contains(e.target as Node)) {
        setGameOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [gameOpen]);

  
  useEffect(() => {
    if (!categoryOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!categoryRef.current) return;
      if (!categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [categoryOpen]);

  
  useEffect(() => {
    if (!statusOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!statusRef.current) return;
      if (!statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [statusOpen]);

  
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const hasChanges = useMemo(() => (
    (showCategory && category !== (initial.category ?? 'all')) ||
    (showGame && game !== (initial.game ?? 'all')) ||
    (showSort && sortBy !== (initial.sortBy ?? 'recent')) ||
    (showStatus && status !== (initial.status ?? 'all'))
  ), [category, game, sortBy, status, showCategory, showGame, showSort, showStatus, initial.category, initial.game, initial.sortBy, initial.status]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (showCategory && category !== 'all') count++;
    if (showGame && game !== 'all') count++;
    if (showSort && sortBy !== 'recent') count++;
    if (showStatus && hasStatuses && status !== 'all') count++;
    return count;
  }, [category, game, sortBy, status, showCategory, showGame, showSort, showStatus, hasStatuses]);

  const handleClear = () => {
    if (showCategory) setCategory('all');
    if (showGame) setGame('all');
    if (showSort) setSortBy('recent');
    if (showStatus) setStatus('all');
  };

  const getStatusIcon = (statusValue: string) => {
    const statusLower = statusValue.toLowerCase();
    if (statusLower.includes('pending') || statusLower.includes('aguardando')) return Clock;
    if (statusLower.includes('complete') || statusLower.includes('concluído')) return CheckCircle;
    if (statusLower.includes('cancel') || statusLower.includes('cancelado')) return XCircle;
    if (statusLower.includes('problem') || statusLower.includes('problema')) return AlertCircle;
    return CheckCircle;
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="app-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.2,
            ease: [0.22, 1, 0.36, 1]
          }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="filters-modal-title"
            className="app-modal-panel max-w-lg w-full mx-4 max-h-[90vh] flex flex-col"
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 260,
                damping: 20,
                mass: 0.8,
                velocity: 2
              }
            }}
            exit={{ 
              opacity: 0, 
              y: -20, 
              scale: 0.96,
              transition: {
                duration: 0.2,
                ease: [0.76, 0, 0.24, 1]
              }
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {}
            <motion.div 
              className="sticky top-0 z-10 bg-gradient-to-br from-gray-900 via-gray-900/95 to-gray-800/90 backdrop-blur-xl border-b border-gray-700/50 rounded-t-xl"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.1, 
                duration: 0.3, 
                ease: [0.25, 0.46, 0.45, 0.94] 
              }}
            >
              <div className="px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-600/40"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                        delay: 0.15
                      }}
                    >
                      <Filter className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <h2 id="filters-modal-title" className="text-white font-bold text-lg sm:text-xl">{title}</h2>
                      {activeFiltersCount > 0 && (
                        <motion.p 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-purple-300 mt-0.5 flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{activeFiltersCount} {activeFiltersCount === 1 ? 'filtro ativo' : 'filtros ativos'}</span>
                        </motion.p>
                      )}
                    </motion.div>
                  </div>
                  <motion.button
                    aria-label="Fechar"
                    className="p-2 sm:p-2.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 transition-all"
                    onClick={onClose}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {}
            <motion.div 
              className="px-4 sm:px-6 py-5 sm:py-6 space-y-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              {}
              {showGame && (
                <motion.div
                  className="relative z-40"
                  ref={gameRef}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <label className="block text-sm font-semibold text-gray-200 mb-2.5 flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-purple-400"/>
                    <span>Jogo</span>
                    {game !== 'all' && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/40 font-medium"
                      >
                        ✓ Filtrado
                      </motion.span>
                    )}
                  </label>
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={gameOpen}
                    onClick={() => setGameOpen((v) => !v)}
                    className={`field-trigger w-full bg-gray-800/60 hover:bg-gray-700/80 text-white border rounded-xl px-4 py-3 sm:py-3.5 flex items-center justify-between focus:outline-none focus:ring-2 transition-all ${gameOpen ? 'ring-2 ring-purple-500/50 border-purple-500/70 bg-gray-700/80' : 'border-gray-700/70 hover:border-purple-500/40'}`}
                  >
                    <span className="truncate text-left font-medium">{game === 'all' ? 'Todos os jogos' : game}</span>
                    <ChevronDown className={`w-4 h-4 ml-2 text-purple-400 transition-transform duration-200 ${gameOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {gameOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute z-[100] mt-2 w-full rounded-xl border border-purple-500/30 bg-gray-800/98 backdrop-blur-sm shadow-2xl shadow-purple-600/20 overflow-hidden"
                      >
                        <div className="dropdown-panel modal-scrollbar max-h-48 overflow-y-auto py-2">
                          {games.map((g, idx) => {
                            const selected = g === game;
                            return (
                              <motion.button
                                key={g}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => { setGame(g); setGameOpen(false); }}
                                className={`dropdown-item w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${selected ? 'bg-purple-600/20 text-white border-l-2 border-purple-500' : 'text-gray-300 hover:bg-gray-700/60 hover:text-white border-l-2 border-transparent'}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.12, delay: idx * 0.02 }}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <span className="truncate font-medium">{g === 'all' ? '🎮 Todos os jogos' : g}</span>
                                {selected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="ml-2"
                                  >
                                    <Check className="w-4 h-4 text-purple-400" />
                                  </motion.div>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {}
              {showCategory && (
                <motion.div
                  className="relative z-30"
                  ref={categoryRef}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <label className="block text-sm font-semibold text-gray-200 mb-2.5 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-purple-400"/>
                    <span>Categoria</span>
                    {category !== 'all' && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/40 font-medium"
                      >
                        ✓ Filtrado
                      </motion.span>
                    )}
                  </label>
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={categoryOpen}
                    onClick={() => setCategoryOpen((v) => !v)}
                    className={`field-trigger w-full bg-gray-800/60 hover:bg-gray-700/80 text-white border rounded-xl px-4 py-3 sm:py-3.5 flex items-center justify-between focus:outline-none focus:ring-2 transition-all ${categoryOpen ? 'ring-2 ring-purple-500/50 border-purple-500/70 bg-gray-700/80' : 'border-gray-700/70 hover:border-purple-500/40'}`}
                  >
                    <span className="truncate text-left font-medium">{category === 'all' ? 'Todas as categorias' : translateCategoryLabel(category)}</span>
                    <ChevronDown className={`w-4 h-4 ml-2 text-purple-400 transition-transform duration-200 ${categoryOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {categoryOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute z-[100] mt-2 w-full rounded-xl border border-purple-500/30 bg-gray-800/98 backdrop-blur-sm shadow-2xl shadow-purple-600/20 overflow-hidden"
                      >
                        <div className="dropdown-panel modal-scrollbar max-h-48 overflow-y-auto py-2">
                          {categories.map((c, idx) => {
                            const selected = c === category;
                            return (
                              <motion.button
                                key={c}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => { setCategory(c); setCategoryOpen(false); }}
                                className={`dropdown-item w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${selected ? 'bg-purple-600/20 text-white border-l-2 border-purple-500' : 'text-gray-300 hover:bg-gray-700/60 hover:text-white border-l-2 border-transparent'}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.12, delay: idx * 0.02 }}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <span className="truncate font-medium">{c === 'all' ? '🏷️ Todas as categorias' : translateCategoryLabel(c)}</span>
                                {selected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="ml-2"
                                  >
                                    <Check className="w-4 h-4 text-purple-400" />
                                  </motion.div>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {}
              {showSort && (
                <motion.div
                  className="relative z-20"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <label className="block text-sm font-semibold text-gray-200 mb-2.5 flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-purple-400"/>
                    <span>Ordenar por</span>
                    {sortBy !== 'recent' && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/40 font-medium"
                      >
                        ✓ Ordenado
                      </motion.span>
                    )}
                  </label>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as FilterModalValues['sortBy'])}
                      className="field-select w-full bg-gray-800/60 hover:bg-gray-700/80 text-white border border-gray-700/70 hover:border-purple-500/40 rounded-xl px-4 py-3 sm:py-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none cursor-pointer font-medium"
                    >
                      {Object.entries(sortLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="w-4 h-4 text-purple-400" />
                    </div>
                  </div>
                </motion.div>
              )}

              {}
              {showStatus && hasStatuses && (
                <motion.div
                  className="relative z-10"
                  ref={statusRef}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="block text-sm font-semibold text-gray-200 mb-2.5 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400"/>
                    <span>Status</span>
                    {status !== 'all' && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-auto text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/40 font-medium"
                      >
                        ✓ Filtrado
                      </motion.span>
                    )}
                  </label>
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={statusOpen}
                    onClick={() => setStatusOpen((v) => !v)}
                    className={`field-trigger w-full bg-gray-800/60 hover:bg-gray-700/80 text-white border rounded-xl px-4 py-3 sm:py-3.5 flex items-center justify-between focus:outline-none focus:ring-2 transition-all ${statusOpen ? 'ring-2 ring-purple-500/50 border-purple-500/70 bg-gray-700/80' : 'border-gray-700/70 hover:border-purple-500/40'}`}
                  >
                    <span className="truncate text-left font-medium flex items-center gap-2">
                      {status !== 'all' && (() => {
                        const Icon = getStatusIcon(status);
                        return <Icon className="w-4 h-4" />;
                      })()}
                      {translateStatus(status)}
                    </span>
                    <ChevronDown className={`w-4 h-4 ml-2 text-purple-400 transition-transform duration-200 ${statusOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {statusOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute z-[100] mt-2 w-full rounded-xl border border-purple-500/30 bg-gray-800/98 backdrop-blur-sm shadow-2xl shadow-purple-600/20 overflow-hidden"
                      >
                        <div className="dropdown-panel modal-scrollbar max-h-48 overflow-y-auto py-2">
                          {statuses.map((s, idx) => {
                            const selected = s === status;
                            const Icon = s === 'all' ? CheckCircle : getStatusIcon(s);
                            return (
                              <motion.button
                                key={s}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => { setStatus(s); setStatusOpen(false); }}
                                className={`dropdown-item w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${selected ? 'bg-purple-600/20 text-white border-l-2 border-purple-500' : 'text-gray-300 hover:bg-gray-700/60 hover:text-white border-l-2 border-transparent'}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.12, delay: idx * 0.02 }}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <span className="truncate font-medium flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  {translateStatus(s)}
                                </span>
                                {selected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="ml-2"
                                  >
                                    <Check className="w-4 h-4 text-purple-400" />
                                  </motion.div>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>

            {}
            <motion.div 
              className="sticky bottom-0 border-t border-gray-700/50 bg-gradient-to-t from-gray-900 via-gray-900/98 to-gray-900/95 backdrop-blur-xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 rounded-b-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.button
                type="button"
                onClick={handleClear}
                className="flex-1 sm:flex-none px-5 py-3 sm:py-3.5 rounded-xl bg-gray-800/60 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700/70 hover:border-gray-600 transition-all font-semibold text-sm flex items-center justify-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-800/60"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={activeFiltersCount === 0}
              >
                <RotateCcw className="w-4 h-4 group-hover:rotate-[-360deg] transition-transform duration-700" />
                <span>Limpar filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => onApply({ category, game, sortBy, status })}
                className="flex-1 px-6 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold shadow-lg shadow-purple-600/40 hover:shadow-purple-600/60 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:to-purple-700 disabled:shadow-purple-600/20"
                disabled={!hasChanges}
                whileHover={hasChanges ? { scale: 1.02, y: -1 } : {}}
                whileTap={hasChanges ? { scale: 0.98 } : {}}
              >
                <Sparkles className="w-4 h-4" />
                <span>Aplicar filtros</span>
                {hasChanges && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-1.5 py-0.5 bg-white/20 text-white text-xs rounded-full"
                  >
                    {activeFiltersCount}
                  </motion.span>
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FilterModal;
