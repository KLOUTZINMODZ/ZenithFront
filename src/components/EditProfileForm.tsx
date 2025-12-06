import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import { Phone, Shield, Mail, Lock, CheckCircle2, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import api from '../services/api';

interface EditProfileFormProps {
  onClose?: () => void;
}

const EditProfileForm: React.FC<EditProfileFormProps> = ({ onClose }) => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneChangesLeft, setPhoneChangesLeft] = useState(4);
  const [activeView, setActiveView] = useState<'main' | 'verification'>('main');
  const [verificationType, setVerificationType] = useState<'phone' | '2fa'>('phone');
  const [pendingPhone, setPendingPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    fetchPhoneChangesLeft();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const fetchPhoneChangesLeft = async () => {
    try {
      const response = await api.get('/users/phone-changes-left');
      setPhoneChangesLeft(response.data.changesLeft);
    } catch (err) {
    }
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const requestPhoneChange = async () => {
    
    setError(null);
    setSuccess(null);

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setError('Número de telefone inválido');
      setTimeout(() => setError(null), 5000);
      return;
    }

    if (phoneChangesLeft <= 0) {
      setError('Você atingiu o limite de trocas de telefone este ano');
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/users/request-phone-change', { phoneNumber: phone });
      
      if (response.data.success) {
        setPendingPhone(phone);
        setVerificationType('phone');
        setActiveView('verification');
        setVerificationCode('');
        setSuccess('Código de verificação enviado para seu email!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Erro ao solicitar troca de telefone';
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const requestEnable2FA = async () => {
    
    setError(null);
    setSuccess(null);

    try {
      setLoading(true);
      const response = await api.post('/users/request-2fa-enable');
      
      if (response.data.success) {
        setVerificationType('2fa');
        setActiveView('verification');
        setVerificationCode('');
        setSuccess('Código de verificação enviado para seu email!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Erro ao solicitar ativação de 2FA';
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 10) {
      setError('❌ O código deve ter 10 dígitos');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setVerifyLoading(true);
      setError(null);
      setSuccess(null);

      if (verificationType === 'phone') {
        const response = await api.post('/users/verify-phone-change', {
          code: verificationCode,
          phoneNumber: pendingPhone
        });
        if (response.data.success) {
          setSuccess('🎉 Telefone atualizado com sucesso!');
          setPhoneChangesLeft(response.data.changesLeft || phoneChangesLeft - 1);
          setPhone(pendingPhone);
          setPendingPhone('');
          setActiveView('main');
          setVerificationCode('');
        }
      } else if (verificationType === '2fa') {
        const response = await api.post('/users/verify-2fa-enable', { code: verificationCode });
        if (response.data.success) {
          setSuccess('2FA ativado com sucesso! Recarregando página...');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Erro ao verificar código';
      setError('❌ ' + errorMsg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleBackToMain = () => {
    setActiveView('main');
    setVerificationCode('');
    setPendingPhone('');
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    setError(null);
    setSuccess(null);
    
    if (!name.trim()) {
      setError('O nome não pode estar vazio');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setLoading(true);

    try {
      const success = await updateProfile({ name });

      if (success) {
        setSuccess('Perfil atualizado com sucesso!');
        setTimeout(() => {
          setSuccess(null);
          if (onClose) onClose();
        }, 2000);
      } else {
        throw new Error('Erro ao atualizar perfil');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao atualizar perfil';
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-profile-form p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-md rounded-2xl border border-purple-500/20 shadow-2xl w-full max-w-2xl mx-auto overflow-hidden">
      <AnimatePresence mode="wait">
        {}
        {activeView === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">Editar Perfil</h2>
                <p className="text-sm text-gray-400 mt-1">Gerencie suas informações e segurança</p>
              </div>
              {onClose && (
                <button 
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors duration-200 w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-700/50 text-2xl"
                  type="button"
                >
                  ×
                </button>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
          {}
          <div className="group">
            <label htmlFor="name" className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Nome de Usuário
            </label>
            <div className="relative">
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:bg-gray-800/70"
                placeholder="Seu nome de usuário"
              />
            </div>
          </div>
          
          {}
          <div className="group">
            <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              Email
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                className="w-full px-4 py-3 bg-gray-800/30 border border-gray-700/50 rounded-xl text-gray-400 cursor-not-allowed"
                disabled
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <span className="text-xs text-gray-500 bg-gray-900/80 px-3 py-1 rounded-full border border-gray-700/50 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Bloqueado
                </span>
              </div>
            </div>
          </div>

          {}
          <div className="group">
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-purple-400" />
                Telefone
              </div>
              <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">
                {phoneChangesLeft} {phoneChangesLeft === 1 ? 'troca restante' : 'trocas restantes'} este ano
              </span>
            </label>
            <div className="flex gap-2">
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={15}
                className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:bg-gray-800/70"
                placeholder="(00) 00000-0000"
              />
              <Button
                type="button"
                onClick={requestPhoneChange}
                disabled={loading || phoneChangesLeft <= 0 || phone === user?.phoneNumber}
                className="px-4 py-3 whitespace-nowrap"
              >
                {loading ? 'Enviando...' : 'Verificar'}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Requer verificação por email
            </p>
          </div>

          {}
          <div className="bg-gradient-to-r from-purple-900/10 to-blue-900/10 border border-purple-500/20 rounded-xl p-4 hover:border-purple-500/40 transition-all duration-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">Autenticação (2FA)</h3>
                  <div className="flex items-center gap-2">
                    {(user as any)?.twoFactorEnabled ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">2FA Ativado</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">2FA Desativado</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {!(user as any)?.twoFactorEnabled && (
                <Button
                  type="button"
                  onClick={requestEnable2FA}
                  disabled={loading}
                  className="px-6 py-2.5 whitespace-nowrap"
                >
                  Ativar 2FA
                </Button>
              )}
            </div>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border-2 border-red-500/50 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 shadow-lg">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-red-300 font-medium">{error}</p>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-500/10 border-2 border-green-500/50 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 shadow-lg">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-green-300 font-medium">{success}</p>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700/50">
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 py-3 text-base font-semibold"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            
            {onClose && (
              <Button 
                type="button"
                variant="outline" 
                onClick={onClose}
                className="flex-1 py-3 text-base font-semibold"
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
          </motion.div>
        )}

        {}
        {activeView === 'verification' && (
          <motion.div
            key="verification"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={handleBackToMain}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700/50 rounded-lg"
                type="button"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {verificationType === 'phone' ? '📱 Verificar Telefone' : '🛡️ Verificar 2FA'}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Código enviado para {user?.email}
                </p>
              </div>
              {onClose && (
                <button 
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors duration-200 w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-700/50 text-2xl"
                  type="button"
                >
                  ×
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Digite o código de 10 dígitos
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && verificationCode.length === 10) {
                      handleVerifyCode();
                    }
                  }}
                  autoFocus
                  className="w-full px-4 py-4 bg-gray-800 border-2 border-gray-600 rounded-xl text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-500"
                  placeholder="• • • • • • • • • •"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border-2 border-red-500/50 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                  <p className="text-red-300 font-medium">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border-2 border-green-500/50 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                  <p className="text-green-300 font-medium">{success}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleVerifyCode}
                  disabled={verifyLoading || verificationCode.length !== 10}
                  className="flex-1 py-3"
                >
                  {verifyLoading ? 'Verificando...' : 'Verificar Código'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (verificationType === 'phone') {
                      requestPhoneChange();
                    } else {
                      requestEnable2FA();
                    }
                    setCountdown(60);
                  }}
                  disabled={countdown > 0 || loading}
                  className="flex-1 py-3"
                >
                  {countdown > 0 ? `Aguarde ${countdown}s` : 'Reenviar'}
                </Button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-sm text-blue-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Verifique sua caixa de entrada e spam
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EditProfileForm;