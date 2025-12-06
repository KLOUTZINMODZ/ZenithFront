import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Wallet, Sparkles, Shield, Clock, User, KeyRound, DollarSign } from 'lucide-react';
import { walletService } from '../services';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { safeNavigate, safeFormSubmit } from '../utils/navigationHelper';

const easeBezier: [number, number, number, number] = [0.22, 1, 0.36, 1];
const QUICK_AMOUNTS = [20, 30, 50];


const onlyDigits = (v: string) => v.replace(/\D/g, '');
const maskCPF = (digits: string) => {
  const d = onlyDigits(digits).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const pixTypeLabel = (t: 'cpf' | 'cnpj') => ({
  cpf: 'CPF',
  cnpj: 'CNPJ'
}[t]);
const maskCNPJ = (digits: string) => {
  const d = onlyDigits(digits).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};
 
const formatBRL = (raw: string) => {
  const digits = onlyDigits(raw);
  const value = Number(digits || '0') / 100;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
const toBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const parseBRL = (str: string) => {
  if (!str) return 0;
  const s = str.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};
const validatePixKey = (key: string, type: string) => {
  if (!key) return true;
  switch (type) {
    case 'cpf':
      return onlyDigits(key).length === 11;
    case 'cnpj':
      return onlyDigits(key).length === 14;
    default:
      return true;
  }
};

const DepositPage: React.FC = () => {
  const navigate = useNavigate();

  const [amountInput, setAmountInput] = useState<string>('R$ 0,00');

  const [docType, setDocType] = useState<'cpf' | 'cnpj'>('cpf');
  const [docDigits, setDocDigits] = useState<string>('');

  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj'>('cpf');
  const [pixKey, setPixKey] = useState<string>('');
  const [showPixSection, setShowPixSection] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const amountValue = useMemo(() => parseBRL(amountInput), [amountInput]);
  const docMasked = useMemo(() => (docType === 'cpf' ? maskCPF(docDigits) : maskCNPJ(docDigits)), [docDigits, docType]);
  const pixMasked = useMemo(() => {
    switch (pixKeyType) {
      case 'cpf': return maskCPF(pixKey);
      case 'cnpj': return maskCNPJ(pixKey);
      default: return pixKey;
    }
  }, [pixKey, pixKeyType]);

  const docValid = useMemo(() => {
    const len = onlyDigits(docDigits).length;
    return (docType === 'cpf' && len === 11) || (docType === 'cnpj' && len === 14);
  }, [docDigits, docType]);

  const pixValid = useMemo(() => validatePixKey(pixKey, pixKeyType), [pixKey, pixKeyType]);
  const isValid = amountValue > 0 && docValid && pixValid;

  const handleStartDeposit = useCallback(async () => {
    if (!isValid) return;

    const result = await safeFormSubmit(
      'deposit-form',
      async () => {
        setError(null);

        const value = amountValue;
        const cpfCnpj = onlyDigits(docDigits);
        const keyValue = onlyDigits(pixKey);

        const response = await walletService.initiateDeposit({
          amount: value,
          cpfCnpj: cpfCnpj,
          pixType: pixKeyType,
          pixKey: keyValue
        });

        if (response.success && response.data) {
          
          const depositData = {
            transactionId: response.data.transactionId || `temp_${Date.now()}`,
            pixQrCode: response.data.qrCodeImage,        
            pixCopyPaste: response.data.qrCode,          
            asaasPaymentId: response.data.asaasPaymentId,
            expirationDate: response.data.expirationDate,
            breakdown: response.data.breakdown,
            amount: value
          } as any;

          try { 
            localStorage.setItem('hacklote_wallet_deposit_session', JSON.stringify(depositData)); 
          } catch {}

          safeNavigate(navigate, '/deposit/confirm', {
            delay: 200
          });

          return depositData;
        } else {
          throw new Error(response.message || 'Não foi possível iniciar o depósito');
        }
      },
      {
        debounceMs: 1500,
        onStart: () => setIsSubmitting(true),
        onEnd: () => setIsSubmitting(false),
        onError: (err: any) => {
          setError(err?.message || 'Erro ao iniciar depósito');
          console.error('[Deposit] Error:', err);
        }
      }
    );

    if (!result) {
      console.log('[Deposit] Submission blocked (debounce or already processing)');
    }
  }, [isValid, amountValue, docDigits, pixKey, pixKeyType, navigate]);

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
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Depositar</h1>
                <p className="text-sm text-gray-400">Adicione saldo via PIX com segurança</p>
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Dados do Depósito</h2>
                  <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-md border border-purple-500/30">
                    Etapa 1 de 2
                  </span>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); if (!isSubmitting && isValid) { handleStartDeposit(); } }} noValidate>
                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alert" className="mb-4 bg-red-900/20 border border-red-700/30 rounded-lg p-3 text-sm text-red-300">
                      {error}
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  <motion.div
                    key="amount-field"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.35, ease: easeBezier }}
                  >
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
                        <motion.button
                          key={v}
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setAmountInput((v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))}
                          className={`${amountValue === v ? 'bg-gray-600 text-white border-gray-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700/60'} px-3 py-1.5 rounded-full border transition-colors text-sm`}
                        >
                          {v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </motion.button>
                      ))}
                    </div>
                    <p id="amount-help" className="mt-2 text-xs text-gray-400">Use os atalhos ou digite um valor. Depósito mínimo recomendado: R$ 5,00.</p>
                  </motion.div>

                  <motion.div
                    key="document-field"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.35, ease: easeBezier, delay: 0.05 }}
                  >
                    <fieldset>
                      <div>
                        <Input
                          label={docType === 'cpf' ? 'CPF' : 'CNPJ'}
                          type="text"
                          placeholder={docType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                          value={docMasked}
                          onChange={(e) => setDocDigits(onlyDigits(e.target.value))}
                          error={docDigits && !docValid ? 'Documento inválido' : undefined}
                          aria-invalid={Boolean(docDigits && !docValid)}
                        />
                      </div>
                      <div className="mt-2 inline-flex p-1 bg-gray-800 border border-gray-700 rounded-lg">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={docType === 'cpf'}
                          aria-label="CPF"
                          onClick={() => setDocType('cpf')}
                          className={`px-4 py-2 rounded-md transition-colors ${docType === 'cpf' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700/60'}`}
                        >CPF</button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={docType === 'cnpj'}
                          aria-label="CNPJ"
                          onClick={() => setDocType('cnpj')}
                          className={`px-4 py-2 rounded-md transition-colors ${docType === 'cnpj' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700/60'}`}
                        >CNPJ</button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Obrigatório para emissão do PIX</p>
                    </fieldset>
                  </motion.div>

                  <motion.div
                    key="pix-key-field"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.35, ease: easeBezier, delay: 0.1 }}
                    className="sm:col-span-2"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-300">Chave PIX (opcional)</label>
                      <button
                        type="button"
                        className="text-sm text-purple-300 hover:text-white transition-colors"
                        onClick={() => {
                          if (showPixSection) { setPixKey(''); }
                          setShowPixSection((v) => !v);
                        }}
                        aria-expanded={showPixSection}
                        aria-controls="pix-optional-section"
                      >
                        {showPixSection ? 'Remover' : 'Adicionar'}
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {showPixSection && (
                        <motion.div
                          id="pix-optional-section"
                          key="pix-section"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.25, ease: easeBezier }}
                          className="space-y-2"
                        >
                          <div className="inline-flex p-1 bg-gray-800 border border-gray-700 rounded-lg" role="radiogroup" aria-label="Tipo de chave PIX">
                            {[
                              { k: 'cpf', label: 'CPF' },
                              { k: 'cnpj', label: 'CNPJ' }
                            ].map(({ k, label }) => (
                              <button
                                key={k}
                                type="button"
                                role="radio"
                                aria-checked={pixKeyType === (k as any)}
                                onClick={() => setPixKeyType(k as any)}
                                className={`${pixKeyType === (k as any) ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700/60'} px-3 py-2 rounded-md transition-colors`}
                              >{label}</button>
                            ))}
                          </div>
                          <Input
                            type="text"
                            placeholder={
                              pixKeyType === 'cpf' ? '000.000.000-00' :
                              '00.000.000/0000-00'
                            }
                            value={pixMasked}
                            onChange={(e) => setPixKey(e.target.value)}
                            error={!pixValid ? 'Chave PIX inválida para o tipo selecionado' : undefined}
                          />
                          <p className="text-xs text-gray-400">Ajuda a identificar seu pagamento.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </AnimatePresence>
              </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                      <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <Clock className="w-4 h-4" />
                        <span>Confirmação automática</span>
                      </div>
                      <button
                        type="submit"
                        onClick={handleStartDeposit}
                        disabled={!isValid || isSubmitting}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-lg text-white transition-all font-medium shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Gerando QR...' : (
                          <>
                            Confirmar Depósito
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
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4 text-base">Resumo</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Valor</span>
                    <span className="text-white font-semibold">{toBRL(amountValue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Documento</span>
                    <span className="text-white text-sm">{docMasked || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Chave PIX</span>
                    <div className="text-right">
                      <div className="text-white text-sm">{pixTypeLabel(pixKeyType)}</div>
                      <div className="text-gray-500 text-xs">{pixMasked || '—'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-400 text-xs">Após preencher os dados, você receberá um QR Code para pagamento via PIX.</p>
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

export default DepositPage;
