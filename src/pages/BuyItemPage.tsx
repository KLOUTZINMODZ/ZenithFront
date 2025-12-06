import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2, Calendar, Fingerprint, Mail, User as UserIcon, ChevronDown, ShoppingCart, ArrowLeft, Shield } from 'lucide-react';
import { marketplaceService, authService } from '../services';
import purchaseService, { BuyerInfo } from '../services/purchaseService';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import chatApi from '../services/chatApi';
import { safeNavigate, safeFormSubmit } from '../utils/navigationHelper';
import ImagePlaceholder from '../components/ImagePlaceholder';

interface ItemSummary {
  _id: string;
  title: string;
  image: string;
  price: number;
  seller: { _id: string; name: string };
}

const onlyDigits = (v: string) => (v || '').replace(/\D/g, '');
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').toLowerCase());
const isAdult = (iso: string) => {
  try {
    const d = new Date(iso);
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age >= 18;
  } catch { return false; }
};

function validateCPF(cpf: string): boolean {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^([0-9])\1{10}$/.test(d)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(d.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0; if (rest !== parseInt(d.substring(9, 10))) return false;
  sum = 0; for (let i = 1; i <= 10; i++) sum += parseInt(d.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11; if (rest === 10 || rest === 11) rest = 0; return rest === parseInt(d.substring(10, 11));
}

const normalizeImageUrl = (url: string): string => {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  const base = (chatApi.defaults.baseURL || '').replace(/\/$/, '');
  if (url.startsWith('/')) return `${base}${url}`;
  return `${base}/${url}`;
};

const formatCPF = (value: string): string => {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
};


const AnimatedDropdown: React.FC<{
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
}> = ({ id, label, options, value, onChange, placeholder = 'Selecione...', isOpen, onOpenChange, disabled }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onOpenChange]);

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <label htmlFor={`dd-${id}`} className="flex items-center gap-2 text-sm font-medium text-gray-300 transition-colors duration-200">
        {label}
      </label>
      <div className="relative">
        <button
          id={`dd-${id}`}
          type="button"
          onClick={() => { if (!disabled) onOpenChange(!isOpen); }}
          disabled={!!disabled}
          className={`w-full px-3 py-2 bg-gray-800/80 backdrop-blur-sm border border-gray-700/70 rounded-xl text-white focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all flex items-center justify-between ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:border-gray-600'}`}
        >
          <span className="truncate text-left">{selectedLabel}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && !disabled && (
            <motion.div
              key="dropdown"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="absolute z-50 left-0 right-0 mt-2"
            >
              <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/70 rounded-xl shadow-2xl overflow-hidden">
                <div className="max-h-[9.5rem] overflow-y-auto custom-scrollbar">
                  {options.map(opt => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => { onChange(opt.value); onOpenChange(false); }}
                      className={`w-full px-3 py-3 text-left text-sm transition-colors ${
                        value === opt.value ? 'bg-purple-600/20 text-white' : 'text-gray-200 hover:bg-gray-800/80'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const BuyItemPage: React.FC = () => {
  const [search] = useSearchParams();
  const { state } = useLocation() as any;
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { user, updateProfile } = useAuth();

  const itemId = search.get('item');
  const [item, setItem] = useState<ItemSummary | null>(state?.item || null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');

  
  const [birthDay, setBirthDay] = useState<string>('');
  const [birthMonth, setBirthMonth] = useState<string>('');
  const [birthYear, setBirthYear] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState<'day' | 'month' | 'year' | null>(null);

  const cpfFromProfile = ((): string => {
    const c1 = (user?.cpf || '').trim();
    const c2 = (user?.cpfCnpj || '').trim();
    const digits = (c1 || c2 || '').replace(/\D/g, '');
    return digits;
  })();
  const backendBirthDate = user?.birthDate || '';
  const [serverCpf, setServerCpf] = useState<string>('');
  const [serverBirthDate, setServerBirthDate] = useState<string>('');
  const lockCPF = useMemo(() => (cpfFromProfile.length === 11) || (serverCpf.length === 11), [cpfFromProfile, serverCpf]);
  const lockBirthDate = useMemo(() => Boolean(backendBirthDate || serverBirthDate), [backendBirthDate, serverBirthDate]);

  const cpfValid = useMemo(() => validateCPF(cpf), [cpf]);
  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const adult = useMemo(() => isAdult(birthDate), [birthDate]);
  const isOwnItem = useMemo(() => {
    try {
      const currentUserId = (user as any)?._id || (user as any)?.id;
      return Boolean(item && user && String(item.seller?._id) === String(currentUserId));
    } catch { return false; }
  }, [item, user]);
  const canSubmit = useMemo(() => fullName.trim().length >= 5 && cpfValid && emailValid && adult && !!item && !isOwnItem, [fullName, cpfValid, emailValid, adult, item, isOwnItem]);

  useEffect(() => {
    if (item && item.image && !/^https?:\/\//.test(item.image)) {
      setItem(prev => prev ? { ...prev, image: normalizeImageUrl(prev.image) } : prev);
    }
  }, [item?.image]);

  useEffect(() => {
    const firstFromState = (state?.item?.images && state.item.images[0]) || '';
    if (item && firstFromState) {
      setItem(prev => prev ? { ...prev, image: normalizeImageUrl(firstFromState) } : prev);
    }
  }, [item?.image, state]);

  useEffect(() => {
    
    if (birthYear && birthMonth && birthDay) {
      const mm = String(birthMonth).padStart(2, '0');
      const dd = String(birthDay).padStart(2, '0');
      const newBD = `${birthYear}-${mm}-${dd}`;
      if (birthDate !== newBD) setBirthDate(newBD);
    }
    
  }, [birthYear, birthMonth, birthDay]);

  useEffect(() => {
    
    if (birthDate) {
      const [y, m, d] = birthDate.split('-');
      if (y && m && d) {
        if (birthYear !== y) setBirthYear(y);
        if (birthMonth !== m) setBirthMonth(m);
        if (birthDay !== d) setBirthDay(d);
      }
    }
  }, [birthDate]);

  
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current) return;
    let appliedSomething = false;

    
    try {
      const raw = localStorage.getItem('saved_buyer_info');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.fullName && !fullName) { setFullName(saved.fullName); appliedSomething = true; }
        if (saved.cpf && !cpf) { setCpf(formatCPF(saved.cpf)); appliedSomething = true; }
        if (saved.email && !email) { setEmail(saved.email); appliedSomething = true; }
        if (saved.birthDate && !birthDate) { setBirthDate(saved.birthDate); appliedSomething = true; }
      }
    } catch {}

    
    try {
      const rawUserStr = localStorage.getItem('user');
      if (rawUserStr) {
        const ru = JSON.parse(rawUserStr);
        const legalOrName = ru?.legalName || ru?.name;
        if (legalOrName && !fullName) { setFullName(legalOrName); appliedSomething = true; }
        const emailLocal = ru?.email;
        if (emailLocal && !email) { setEmail(emailLocal); appliedSomething = true; }
        const cpfDigitsLocal = String(ru?.cpf || ru?.cpfCnpj || '').replace(/\D/g, '');
        if (cpfDigitsLocal.length === 11 && !cpf) { setCpf(formatCPF(cpfDigitsLocal)); appliedSomething = true; }
        const bdRaw = ru?.birthDate;
        let bdIso: string | null = null;
        if (typeof bdRaw === 'string') { const d = new Date(bdRaw); if (!isNaN(d.getTime())) bdIso = d.toISOString().slice(0,10); }
        else if (bdRaw && typeof bdRaw === 'object' && ('$date' in bdRaw)) { const d = new Date(bdRaw.$date); if (!isNaN(d.getTime())) bdIso = d.toISOString().slice(0,10); }
        if (bdIso && !birthDate) { setBirthDate(bdIso); appliedSomething = true; }
      }
    } catch {}

    
    if (user) {
      if (((user as any).legalName || user.name) && !fullName) { setFullName((user as any).legalName || user.name || ''); appliedSomething = true; }
      if (user.email && !email) { setEmail(user.email); appliedSomething = true; }
      if (cpfFromProfile && cpfFromProfile.length === 11 && !cpf) { setCpf(formatCPF(cpfFromProfile)); appliedSomething = true; }
      if (user.birthDate && !birthDate) {
        const bd = new Date(user.birthDate);
        if (!isNaN(bd.getTime())) { setBirthDate(bd.toISOString().slice(0,10)); appliedSomething = true; }
      }
    }

    if (appliedSomething) {
      prefilledRef.current = true;
    }
    
  }, [user]);

  
  useEffect(() => {
    try {
      const data = { fullName, cpf, birthDate, email } as BuyerInfo;
      localStorage.setItem('saved_buyer_info', JSON.stringify(data));
    } catch {}
  }, [fullName, cpf, birthDate, email]);

  
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await authService.getProfile();
        const u = resp?.data?.user as any;
        if (resp?.success && u) {
          
          const digits = String(u.cpf || u.cpfCnpj || '').replace(/\D/g, '');
          if (!cancelled) {
            if (digits.length === 11) {
              setServerCpf(digits);
              if (!cpf) setCpf(formatCPF(digits));
            }
          }
          
          let iso: string | null = null;
          const bdRaw = u.birthDate;
          if (typeof bdRaw === 'string') {
            const d = new Date(bdRaw); if (!isNaN(d.getTime())) iso = d.toISOString().slice(0,10);
          } else if (bdRaw && typeof bdRaw === 'object' && ('$date' in bdRaw)) {
            const d = new Date(bdRaw.$date); if (!isNaN(d.getTime())) iso = d.toISOString().slice(0,10);
          }
          if (!cancelled && iso) {
            setServerBirthDate(iso);
            if (!birthDate) setBirthDate(iso);
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  
  }, []);

  useEffect(() => {
    const loadItem = async () => {
      if (item) return;
      if (!itemId) { setError('Item inválido'); return; }
      setLoading(true);
      setError(null);
      try {
        const resp = await marketplaceService.getItemById(itemId);
        const it = resp.data?.item as any;
        if (!resp.success || !it) { setError(resp.message || 'Item não encontrado'); return; }
        const seller = it.seller || it.sellerId || {};
        const rawImage = (it.images && it.images[0]) || it.image || '';
        const image = normalizeImageUrl(rawImage);
        setItem({ _id: it._id, title: it.title, image, price: Number(it.price) || 0, seller: { _id: String(seller._id || seller.userid || ''), name: seller.name || 'Vendedor' } });
      } catch (e) {
        setError('Erro de conexão ao carregar item');
      } finally { setLoading(false); }
    };
    loadItem();
  }, [itemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    
    if (!canSubmit) {
      addNotification({ title: 'Dados inválidos', message: 'Verifique os campos do formulário.', type: 'error' });
      return;
    }
    
    if (isOwnItem) {
      setError('Você não pode comprar seu próprio item.');
      return;
    }
    
    
    const result = await safeFormSubmit(
      `buy-item-${item._id}`,
      async () => {
        setError(null);
        
        
        const payload: any = {};
        const cpfDigits = onlyDigits(cpf);
        if (!lockCPF) payload.cpf = cpfDigits;
        if (!lockBirthDate) payload.birthDate = birthDate;
        
        if (Object.keys(payload).length > 0) {
          const ok = await updateProfile(payload);
          if (!ok) throw new Error('Não foi possível salvar seus dados de CPF e Nascimento');
        }

        const firstFromState = (state?.item?.images && state.item.images[0]) || '';
        const imageToSend = firstFromState ? normalizeImageUrl(firstFromState) : normalizeImageUrl(item.image);
        const purchasePayload: { itemId: string; price: number; sellerUserId: string; itemTitle: string; itemImage: string; buyerInfo: BuyerInfo } = {
          itemId: item._id,
          price: item.price,
          sellerUserId: item.seller._id,
          itemTitle: item.title,
          itemImage: imageToSend,
          buyerInfo: { fullName, cpf, birthDate, email }
        };
        
        const res = await purchaseService.initiate(purchasePayload);
        
        if (res.success && res.data) {
          
          try { 
            localStorage.setItem('active_conversation_after_nav', res.data.conversationId); 
          } catch {}
          
          
          safeNavigate(navigate, '/messages', {
            delay: 300,
            cleanup: () => {
              
            }
          });
          
          return res.data;
        } else {
          throw new Error(res.message || 'Não foi possível iniciar a compra');
        }
      },
      {
        debounceMs: 1500,
        onStart: () => setSubmitting(true),
        onEnd: () => setSubmitting(false),
        onError: (error: any) => {
          setError(error?.message || 'Erro ao iniciar compra');
          console.error('[BuyItem] Purchase error:', error);
        }
      }
    );
    
    if (!result) {
      
      console.log('[BuyItem] Purchase blocked (debounce or already processing)');
    }
  };

  return (
    <div className="py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                Finalizar Compra
              </h1>
              <p className="text-gray-400 text-sm">Confirme seus dados para concluir</p>
            </div>
          </div>
        </motion.div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          </div>
        )}

        {(error || isOwnItem) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/20 border border-red-700/30 text-red-300 p-4 rounded-xl mb-6 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>{isOwnItem ? 'Você não pode comprar seu próprio item.' : error}</div>
          </motion.div>
        )}

        {item && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 mb-8 overflow-hidden shadow-2xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5" />
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center relative z-10">
              {}
              <div className="relative w-full sm:w-32 h-32 rounded-xl overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg ring-2 ring-purple-500/20 flex-shrink-0">
                {item.image && !imageLoadError ? (
                  <img
                    src={normalizeImageUrl(item.image)}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={() => setImageLoadError(true)}
                  />
                ) : (
                  <ImagePlaceholder className="w-full h-full" />
                )}
              </div>
              
              {}
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-xl sm:text-2xl mb-2 line-clamp-2">{item.title}</h2>
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                  <UserIcon className="w-4 h-4" />
                  <span>Vendido por <span className="text-white font-medium">{item.seller.name}</span></span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                    {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(item.price)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="relative bg-gray-800/60 border border-gray-700/50 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 rounded-2xl" />
          
          {}
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-white mb-2">Dados do Comprador</h3>
            <p className="text-gray-400 text-sm">Preencha as informações para finalizar sua compra</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <Input label="Nome Completo" icon={<UserIcon className="w-4 h-4" />} type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" error={fullName && fullName.trim().length < 5 ? 'Informe o nome completo' : undefined} />
            <Input label="CPF" icon={<Fingerprint className="w-4 h-4" />} type="text" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" error={cpf && !cpfValid ? 'CPF inválido' : undefined} disabled={lockCPF} />

            <div className="space-y-2 md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 transition-colors duration-200">
              <Calendar className="w-4 h-4 text-gray-400" />
              Data de Nascimento
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <AnimatedDropdown
                id="day"
                label="Dia"
                value={birthDay}
                onChange={setBirthDay}
                options={Array.from({ length: 31 }, (_, i) => i + 1).map(d => ({ value: String(d).padStart(2, '0'), label: String(d) }))}
                placeholder="Selecione o dia"
                isOpen={openDropdown === 'day'}
                onOpenChange={(open) => setOpenDropdown(open ? 'day' : null)}
                disabled={lockBirthDate}
              />
              <AnimatedDropdown
                id="month"
                label="Mês"
                value={birthMonth}
                onChange={setBirthMonth}
                options={Array.from({ length: 12 }, (_, idx) => {
                  const value = String(idx + 1).padStart(2, '0');
                  const label = new Date(0, idx).toLocaleString('pt-BR', { month: 'long' });
                  return { value, label };
                })}
                placeholder="Selecione o mês"
                isOpen={openDropdown === 'month'}
                onOpenChange={(open) => setOpenDropdown(open ? 'month' : null)}
                disabled={lockBirthDate}
              />
              <AnimatedDropdown
                id="year"
                label="Ano"
                value={birthYear}
                onChange={setBirthYear}
                options={(() => {
                  const now = new Date();
                  const max = now.getFullYear() - 18;
                  const min = max - 100;
                  const years: number[] = [];
                  for (let y = max; y >= min; y--) years.push(y);
                  return years.map(y => ({ value: String(y), label: String(y) }));
                })()}
                placeholder="Selecione o ano"
                isOpen={openDropdown === 'year'}
                onOpenChange={(open) => setOpenDropdown(open ? 'year' : null)}
                disabled={lockBirthDate}
              />
              </div>
              {birthDate && !adult && (
                <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Idade mínima: 18 anos</p>
                </div>
              )}
            </div>

            <Input label="E-mail" icon={<Mail className="w-4 h-4" />} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@exemplo.com" error={email && !emailValid ? 'E-mail inválido' : undefined} disabled />
          </div>
          
          {}
          <div className="relative z-10 bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-200 text-sm">
                Ao confirmar, seus dados serão vinculados ao seu cadastro e não poderão ser alterados futuramente.
              </p>
            </div>
          </div>
          
          {}
          <div className="flex justify-end relative z-10">
            <Button type="submit" variant="primary" disabled={!canSubmit || submitting} isLoading={submitting}>
              {submitting ? 'Processando...' : 'Confirmar e Comprar'}
            </Button>
          </div>
        </motion.form>

        {}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 border border-green-700/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-semibold text-sm mb-1">Pagamento Seguro</h4>
                <p className="text-gray-400 text-xs">
                  O valor ficará bloqueado até a confirmação da entrega.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/10 border border-purple-700/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-semibold text-sm mb-1">Proteção ao Comprador</h4>
                <p className="text-gray-400 text-xs">
                  Em caso de disputa, um mediador analisará o caso.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BuyItemPage;
