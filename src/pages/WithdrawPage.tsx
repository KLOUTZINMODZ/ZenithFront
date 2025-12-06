import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Wallet, Shield, AlertTriangle, DollarSign, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { walletService } from '../services';
import Input from '../components/ui/Input';
import { safeNavigate, safeFormSubmit } from '../utils/navigationHelper';
import notificationWebSocketService from '../services/notificationWebSocketService';

const easeBezier: [number, number, number, number] = [0.22, 1, 0.36, 1];
const QUICK_AMOUNTS = [20, 50, 100];
const WITHDRAW_FEE = 5.00; 
const MAX_WITHDRAW_AMOUNT = 1000000.00; 
const MAX_FAILED_ATTEMPTS = 5; 
const BLOCK_DURATION_MS = 60 * 60 * 1000; 
const FAILED_ATTEMPTS_KEY = 'withdraw_failed_attempts';
const BLOCK_UNTIL_KEY = 'withdraw_blocked_until';

const onlyDigits = (v: string) => v.replace(/\D/g, '');
const parseBRL = (str: string) => {
  if (!str) return 0;
  const s = str.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};
const formatBRL = (raw: string) => {
  const digits = onlyDigits(raw);
  const value = Number(digits || '0') / 100;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
const maskCPF = (digits: string) => {
  const d = onlyDigits(digits).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};
const maskCNPJ = (digits: string) => {
  const d = onlyDigits(digits).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

const pixTypeLabel = (t: 'cpf' | 'cnpj') => ({
  cpf: 'CPF',
  cnpj: 'CNPJ'
}[t]);

const WithdrawPage: React.FC = () => {
  const navigate = useNavigate();

  const [amountInput, setAmountInput] = useState<string>('R$ 0,00');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj'>('cpf');
  const [pixKey, setPixKey] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [pixKeyInfo, setPixKeyInfo] = useState<{ type: 'PHONE' | 'CPF' | 'CNPJ' | null, keyMasked: string | null, locked: boolean } | null>(null);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState<string>('');
  const [serverBlockInfo, setServerBlockInfo] = useState<{blocked: boolean, remainingMinutes?: number} | null>(null);

  const amountValue = useMemo(() => parseBRL(amountInput), [amountInput]);
  const feeAmount = WITHDRAW_FEE;
  const netAmount = useMemo(() => Math.max(0, amountValue - feeAmount), [amountValue, feeAmount]);
  const pixMasked = useMemo(() => {
    switch (pixKeyType) {
      case 'cpf': return maskCPF(pixKey);
      case 'cnpj': return maskCNPJ(pixKey);
      default: return pixKey;
    }
  }, [pixKey, pixKeyType]);
  const pixValid = useMemo(() => {
    if (!pixKey) return false;
    switch (pixKeyType) {
      case 'cpf': return onlyDigits(pixKey).length === 11;
      case 'cnpj': return onlyDigits(pixKey).length === 14;
      default: return false;
    }
  }, [pixKey, pixKeyType]);

  const phoneBlocked = pixKeyInfo?.type === 'PHONE';
  const amountExceedsLimit = amountValue > MAX_WITHDRAW_AMOUNT;
  const isValid = amountValue > WITHDRAW_FEE && amountValue <= MAX_WITHDRAW_AMOUNT && !phoneBlocked && !isBlocked && (pixValid || (!!pixKeyInfo?.type && pixKeyInfo.type !== 'PHONE'));

  
  useEffect(() => {
    const checkServerBlock = async () => {
      try {
        
        const response = await walletService.checkWithdrawStatus();
        
        if (response.success && response.data) {
          const { blocked, remainingMinutes } = response.data;
          
          if (blocked && remainingMinutes) {
            setIsBlocked(true);
            setServerBlockInfo({ blocked: true, remainingMinutes });
            setBlockTimeRemaining(`${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''}`);
          } else {
            setIsBlocked(false);
            setServerBlockInfo({ blocked: false });
            
            localStorage.removeItem(BLOCK_UNTIL_KEY);
            localStorage.removeItem(FAILED_ATTEMPTS_KEY);
          }
        }
      } catch (error) {
        console.error('[WithdrawPage] Error checking server block status:', error);
        
        const blockedUntil = localStorage.getItem(BLOCK_UNTIL_KEY);
        if (blockedUntil && Date.now() < new Date(blockedUntil).getTime()) {
          const remainingMs = new Date(blockedUntil).getTime() - Date.now();
          const minutes = Math.ceil(remainingMs / 60000);
          setBlockTimeRemaining(`${minutes} minuto${minutes > 1 ? 's' : ''}`);
        }
      }
    };
    
    checkServerBlock();
    const interval = setInterval(checkServerBlock, 15000); 
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await walletService.getWallet(1, 1);
        if (mounted && res.success && res.data) {
          setBalance(res.data.balance);
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {

        try { await walletService.syncWithdraws(); } catch {}

        const info = await walletService.getPixKey();
        if (!alive) return;
        if (info.success && info.data) {
          setPixKeyInfo({ type: info.data.type || null, keyMasked: info.data.keyMasked || null, locked: !!info.data.locked });
          if (info.data.type) {
            if (info.data.type === 'PHONE') {
              setError('Sua chave PIX vinculada é do tipo Telefone, que não é mais suportada para saques. Utilize CPF ou CNPJ.');
            } else {
              const uiType = info.data.type === 'CPF' ? 'cpf' : 'cnpj';
              setPixKeyType(uiType as any);
            }
            if (info.data.keyMasked) setPixKey(info.data.keyMasked);
          }
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onBalance = (payload: any) => {
      try {
        const data = payload?.data || {};
        const balanceValue = typeof data.balance === 'number' ? data.balance : (data?.data?.balance);
        if (typeof balanceValue === 'number') {
          setBalance(balanceValue);
          setSuccessMsg('Saque concluído e saldo atualizado.');
        }
      } catch {}
    };
    notificationWebSocketService.on('wallet_balance_updated', onBalance);
    return () => {
      notificationWebSocketService.off('wallet_balance_updated', onBalance);
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;

    
    if (serverBlockInfo?.blocked) {
      setError(`Você excedeu o limite de tentativas. Tente novamente em ${blockTimeRemaining}.`);
      return;
    }

    const result = await safeFormSubmit(
      'withdraw-form',
      async () => {
        setError(null);
        setSuccessMsg(null);

        try {
          if (pixKeyInfo?.type === 'PHONE') {
            setError('Sua chave PIX por Telefone não é suportada para saques. Utilize CPF ou CNPJ.');
            return;
          }

          
          if (amountValue > MAX_WITHDRAW_AMOUNT) {
            setError(`O valor máximo por saque é de ${MAX_WITHDRAW_AMOUNT.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`);
            return;
          }

          try { await walletService.syncWithdraws(); } catch {}

          const useBound = !!pixKeyInfo?.type;
          const details = useBound ? {} : { pixKey, pixKeyType };
          const idemKey = (globalThis as any)?.crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
          let res = await walletService.withdraw(amountValue, details, { idempotencyKey: idemKey });

          if (!res.success && (res as any)?.error === 'WITHDRAW_DAILY_LIMIT_REACHED') {
            const sync = await walletService.syncWithdraws();
            const nextAt = (sync as any)?.data?.nextResetAt || (res as any)?.data?.nextResetAt;
            setError(`Limite diário atingido: é permitido no máximo 1 saque por dia. Próximo reset: ${nextAt ? new Date(nextAt).toLocaleString('pt-BR') : 'amanhã'}.`);
            return;
          }

          const limitMsg = 'Você já possui o máximo de 5 saques em processamento';
          if (!res.success && ((res as any)?.error === 'WITHDRAW_LIMIT_REACHED' || (res.message || '').includes('5 saques'))) {
            const sync = await walletService.syncWithdraws();
            if (sync?.success) {
              const count = sync?.data?.pendingCount ?? 0;
              if (count < 5) {
                res = await walletService.withdraw(amountValue, details, { idempotencyKey: idemKey });
              } else {
                setError(`${limitMsg}. Pendentes atuais: ${count}.`);
                return;
              }
            }
          }
          if (res.success) {
            
            localStorage.removeItem(FAILED_ATTEMPTS_KEY);
            localStorage.removeItem(BLOCK_UNTIL_KEY);
            setIsBlocked(false);
            setServerBlockInfo({ blocked: false });
            setSuccessMsg(res.message || 'Saque solicitado com sucesso.');

            safeNavigate(navigate, '/wallet', {
              delay: 1500
            });
          } else {
            
            if ((res as any)?.error === 'TOO_MANY_FAILED_ATTEMPTS') {
              const remainingMinutes = (res as any)?.data?.remainingMinutes || 60;
              setIsBlocked(true);
              setServerBlockInfo({ blocked: true, remainingMinutes });
              setBlockTimeRemaining(`${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''}`);
              setError(`Você excedeu o limite de ${MAX_FAILED_ATTEMPTS} tentativas falhas. Tente novamente em ${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''}.`);
              
              
              const blockUntil = new Date(Date.now() + (remainingMinutes * 60000));
              localStorage.setItem(BLOCK_UNTIL_KEY, blockUntil.toISOString());
            } else {
              
              setError(res.message || 'Erro ao solicitar saque');
              
              
              const attemptsStr = localStorage.getItem(FAILED_ATTEMPTS_KEY);
              let attempts: { timestamp: number }[] = [];
              
              if (attemptsStr) {
                try {
                  attempts = JSON.parse(attemptsStr);
                  const oneHourAgo = Date.now() - BLOCK_DURATION_MS;
                  attempts = attempts.filter(a => a.timestamp > oneHourAgo);
                } catch {}
              }
              
              attempts.push({ timestamp: Date.now() });
              localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(attempts));
              
              const remainingAttempts = MAX_FAILED_ATTEMPTS - attempts.length;
              if (remainingAttempts > 0) {
                setError(`${res.message || 'Erro ao solicitar saque'}. Tentativas restantes: ${remainingAttempts}.`);
              }
            }
          }
        } catch (e: any) {
          setError('Erro ao conectar com o servidor');
        }
      },
      {
        debounceMs: 1500,
        onStart: () => setSubmitting(true),
        onEnd: () => setSubmitting(false),
        onError: (e: any) => {
          setError(e?.message || 'Ocorreu um erro ao processar o saque');
          console.error('[Withdraw] Error:', e);
        }
      }
    );

    if (!result) {
      console.log('[Withdraw] Submission blocked (debounce or already processing)');
    }
  }, [amountValue, isValid, pixKey, pixKeyType, pixKeyInfo, navigate, blockTimeRemaining]);

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 via-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/20">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Sacar</h1>
                <p className="text-sm text-gray-400">Transfira seu saldo via PIX</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => safeNavigate(navigate, '/wallet')}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
            </div>
          </div>
        </motion.div>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Dados do Saque</h2>
                  <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-md border border-purple-500/30">
                    Saldo: {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                {}
                <div className="mb-4 bg-yellow-900/20 border border-yellow-600/40 rounded-lg p-3 flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-300 mb-1">Taxa de Saque Aplicada</p>
                    <p className="text-xs text-yellow-200/80">
                      Será cobrada uma taxa fixa de <strong>R$ 5,00</strong> em cada saque. 
                      O valor líquido será transferido para sua chave PIX após a dedução da taxa.
                    </p>
                  </div>
                </div>

                {}
                {isBlocked && (
                  <motion.div 
                    initial={{ opacity: 0, y: -8 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 bg-red-900/20 border border-red-600/40 rounded-lg p-3 flex items-start gap-3"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-300 mb-1">Conta Temporariamente Bloqueada</p>
                      <p className="text-xs text-red-200/80">
                        Você excedeu o limite de {MAX_FAILED_ATTEMPTS} tentativas falhas. 
                        Tente novamente em <strong>{blockTimeRemaining}</strong>.
                      </p>
                    </div>
                  </motion.div>
                )}

                {}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4 bg-red-900/20 border border-red-700/30 rounded-lg p-3 text-sm text-red-300">
                      {error}
                    </motion.div>
                  )}
                  {successMsg && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4 bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-3 text-sm text-emerald-300">
                      {successMsg}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={(e) => { e.preventDefault(); if (!submitting && isValid) handleSubmit(); }} noValidate>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: easeBezier }}>
                        <Input
                          label="Valor (R$)"
                          type="text"
                          inputMode="numeric"
                          placeholder="R$ 0,00"
                          value={amountInput}
                          onChange={(e) => setAmountInput(formatBRL(e.target.value))}
                          icon={<DollarSign className="w-4 h-4" />}
                          autoFocus
                          aria-describedby="amount-help"
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          {QUICK_AMOUNTS.map((v) => (
                            <motion.button key={v} type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} onClick={() => setAmountInput((v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))} className={`${amountValue === v ? 'bg-gray-600 text-white border-gray-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700/60'} px-3 py-1.5 rounded-full border transition-colors text-sm`}>
                              {v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </motion.button>
                          ))}
                        </div>
                        <p id="amount-help" className="mt-2 text-xs text-gray-400">
                          Use os atalhos ou digite um valor. Limite máximo: <strong className="text-purple-400">{MAX_WITHDRAW_AMOUNT.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                        </p>
                        {amountExceedsLimit && (
                          <p className="mt-1 text-xs text-red-400 font-medium">
                            ⚠️ O valor excede o limite máximo de saque
                          </p>
                        )}
                      </motion.div>

                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: easeBezier, delay: 0.05 }}>
                        {pixKeyInfo?.type ? (
                  <>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Chave PIX</label>
                    <div className="inline-flex p-1 bg-gray-800 border border-gray-700 rounded-lg opacity-60" role="radiogroup" aria-label="Tipo de chave PIX">
                      {([
                        { k: 'cpf', label: 'CPF' },
                        { k: 'cnpj', label: 'CNPJ' }
                      ] as const).map(({ k, label }) => (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={pixKeyType === k}
                          aria-disabled="true"
                          disabled
                          className={`${pixKeyType === k ? 'bg-gray-700 text-white' : 'text-gray-300'} px-3 py-2 rounded-md`}
                        >{label}</button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <Input
                        label={`Chave PIX (${pixTypeLabel(pixKeyType)})`}
                        type="text"
                        value={pixKeyInfo.keyMasked || ''}
                        readOnly
                        disabled
                      />
                      <p className="text-xs text-gray-400 mt-1">Esta chave PIX está vinculada à sua conta e é imutável.</p>
                      {phoneBlocked && (
                        <p className="text-xs text-red-400 mt-1">Tipo Telefone não é suportado para saque. Cadastre CPF ou CNPJ para continuar.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Chave PIX</label>
                    <div className="inline-flex p-1 bg-gray-800 border border-gray-700 rounded-lg" role="radiogroup" aria-label="Tipo de chave PIX">
                      {([
                        { k: 'cpf', label: 'CPF' },
                        { k: 'cnpj', label: 'CNPJ' }
                      ] as const).map(({ k, label }) => (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={pixKeyType === k}
                          onClick={() => setPixKeyType(k)}
                          className={`${pixKeyType === k ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700/60'} px-3 py-2 rounded-md transition-colors`}
                        >{label}</button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <Input
                        label={`Chave PIX (${pixTypeLabel(pixKeyType)})`}
                        type="text"
                        placeholder={
                          pixKeyType === 'cpf' ? '000.000.000-00' :
                          '00.000.000/0000-00'
                        }
                        value={pixMasked}
                        onChange={(e) => setPixKey(e.target.value)}
                        error={!pixValid && pixKey ? 'Chave PIX inválida para o tipo selecionado' : undefined}
                      />
                      <p className="text-xs text-gray-400 mt-1">Validações finais são feitas no servidor.</p>
                    </div>
                  </>
                )}
                      </motion.div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                      <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <Clock className="w-4 h-4" />
                        <span>Processamento em até 24h</span>
                      </div>
                      <button
                        type="submit"
                        disabled={!isValid || submitting || isBlocked}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-lg text-white transition-all font-medium shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isBlocked ? `Bloqueado por tentativas falhas. Tente em ${blockTimeRemaining}` : ''}
                      >
                        {submitting ? 'Solicitando...' : (
                          <>
                            Confirmar Saque
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>

          {}
          <div className="lg:col-span-1">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 text-base">Resumo do Saque</h3>
                
                {}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Valor solicitado</span>
                    <span className="text-white font-medium">{amountValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Taxa de saque</span>
                    <span className="text-red-400 font-medium">- {feeAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Você receberá</span>
                      <span className="text-green-400 font-bold text-lg">{netAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  </div>
                </div>

                {}
                <div className="border-t border-white/10 pt-4 space-y-3 text-xs text-gray-400">
                  <div className="flex items-start gap-2">
                    <DollarSign className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-yellow-300 font-medium">Taxa fixa de R$ 5,00 por saque</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <p>Processamento seguro via API Asaas</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <p>Processamento em até 24h</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p>Chave PIX cadastrada uma única vez e não pode ser alterada</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                    <p className="text-orange-300 font-medium">Limite máximo: {MAX_WITHDRAW_AMOUNT.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por saque</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-300">Após {MAX_FAILED_ATTEMPTS} tentativas falhas, aguarde 1 hora para tentar novamente</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WithdrawPage;
