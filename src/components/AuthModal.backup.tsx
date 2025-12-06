import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AuthModal.css';

type AuthMode = 'login' | 'register' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  
  
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'password'>('email');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  const { login, register: registerUser } = useAuth();
  const navigate = useNavigate();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setPhone('');
    setResetCode('');
    setNewPassword('');
    setError('');
    setSuccess('');
    setResetStep('email');
    setResetToken('');
  };

  const handleModeChange = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }
    
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        setSuccess('Login realizado com sucesso!');
        setTimeout(() => {
          handleClose();
          navigate('/');
        }, 1000);
      } else {
        setError(result.error || 'Erro ao fazer login');
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!name || !email || !password) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    
    setLoading(true);
    try {
      const phoneNormalized = phone ? phone.replace(/\D/g, '') : undefined;
      
      const result = await registerUser(name, email, password, phoneNormalized);
      if (result.success) {
        setSuccess('Conta criada com sucesso!');
        setTimeout(() => {
          handleClose();
          navigate('/');
        }, 1000);
      } else {
        setError(result.error || 'Erro ao criar conta');
      }
    } catch (err) {
      setError('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (resetStep === 'email') {
        const response = await axios.post(
          `${import.meta.env.VITE_CHAT_API_URL}/api/auth/forgot-password`,
          { email }
        );
        
        if (response.data.success) {
          setSuccess('Código enviado para seu email!');
          setResetStep('code');
        }
      } else if (resetStep === 'code') {
        const response = await axios.post(
          `${import.meta.env.VITE_CHAT_API_URL}/api/auth/verify-reset-code`,
          { email, code: resetCode }
        );
        
        if (response.data.success) {
          setResetToken(response.data.resetToken);
          setSuccess('Código verificado!');
          setResetStep('password');
        }
      } else if (resetStep === 'password') {
        const response = await axios.post(
          `${import.meta.env.VITE_CHAT_API_URL}/api/auth/reset-password`,
          {
            email,
            resetToken,
            newPassword
          }
        );
        
        if (response.data.success) {
          setSuccess('Senha redefinida com sucesso!');
          setTimeout(() => {
            handleModeChange('login');
          }, 2000);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro na operação');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isActive = mode === 'register';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
              style={{ maxHeight: '90vh' }}
            >
              {}
              <motion.button
                onClick={handleClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </motion.button>

              <div className={`relative min-h-[500px] md:min-h-[550px] transition-all duration-600 ${
                isActive ? 'auth-modal-active' : ''
              }`}>
                
                {}
                <motion.div
                  className={`form-container sign-in ${isActive ? '' : 'active'}`}
                  initial={false}
                  animate={{
                    x: isActive ? '100%' : '0%',
                    opacity: isActive ? 0 : 1
                  }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                >
                  <form onSubmit={mode === 'login' ? handleLogin : mode === 'forgot' ? handleForgotPassword : (e) => e.preventDefault()} className="flex flex-col items-center justify-center h-full px-10">
                    {mode === 'login' && (
                      <>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Entrar</h1>
                        <span className="text-sm text-gray-600 mb-6">Use sua conta Zenith</span>
                        
                        {}
                        <AnimatePresence mode="wait">
                          {error && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
                            >
                              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-red-600">{error}</p>
                            </motion.div>
                          )}
                          {success && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="w-full mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2"
                            >
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-green-600">{success}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="w-full space-y-3">
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Email"
                              className="w-full bg-gray-100 border-none rounded-lg pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                          
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Senha"
                              className="w-full bg-gray-100 border-none rounded-lg pl-11 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleModeChange('forgot')}
                          className="text-sm text-gray-600 hover:text-blue-600 mt-4 mb-6 transition-colors"
                        >
                          Esqueceu sua senha?
                        </button>

                        <motion.button
                          type="submit"
                          disabled={loading}
                          whileHover={{ scale: loading ? 1 : 1.02 }}
                          whileTap={{ scale: loading ? 1 : 0.98 }}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Entrando...
                            </>
                          ) : (
                            'Entrar'
                          )}
                        </motion.button>
                      </>
                    )}

                    {mode === 'forgot' && (
                      <>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Recuperar Senha</h1>
                        <span className="text-sm text-gray-600 mb-6">
                          {resetStep === 'email' && 'Digite seu email'}
                          {resetStep === 'code' && 'Digite o código enviado'}
                          {resetStep === 'password' && 'Defina nova senha'}
                        </span>

                        {}
                        <AnimatePresence mode="wait">
                          {error && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
                            >
                              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-red-600">{error}</p>
                            </motion.div>
                          )}
                          {success && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="w-full mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2"
                            >
                              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-green-600">{success}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="w-full space-y-3">
                          {resetStep === 'email' && (
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="w-full bg-gray-100 border-none rounded-lg pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                            </div>
                          )}

                          {resetStep === 'code' && (
                            <input
                              type="text"
                              value={resetCode}
                              onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                              placeholder="00000000"
                              maxLength={8}
                              className="w-full bg-gray-100 border-none rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          )}

                          {resetStep === 'password' && (
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Nova senha (mín. 6 caracteres)"
                                className="w-full bg-gray-100 border-none rounded-lg pl-11 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3 w-full mt-6">
                          <motion.button
                            type="button"
                            onClick={() => resetStep === 'email' ? handleModeChange('login') : setResetStep('email')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-all"
                          >
                            Voltar
                          </motion.button>
                          
                          <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={{ scale: loading ? 1 : 1.02 }}
                            whileTap={{ scale: loading ? 1 : 0.98 }}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processando...
                              </>
                            ) : (
                              'Continuar'
                            )}
                          </motion.button>
                        </div>
                      </>
                    )}
                  </form>
                </motion.div>

                {}
                <motion.div
                  className={`form-container sign-up ${isActive ? 'active' : ''}`}
                  initial={false}
                  animate={{
                    x: isActive ? '100%' : '0%',
                    opacity: isActive ? 1 : 0
                  }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                >
                  <form onSubmit={handleRegister} className="flex flex-col items-center justify-center h-full px-10">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Criar Conta</h1>
                    <span className="text-sm text-gray-600 mb-6">Registre-se no Zenith</span>
                    
                    {}
                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
                        >
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-600">{error}</p>
                        </motion.div>
                      )}
                      {success && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="w-full mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2"
                        >
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-green-600">{success}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="w-full space-y-3">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Nome completo"
                          className="w-full bg-gray-100 border-none rounded-lg pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email"
                          className="w-full bg-gray-100 border-none rounded-lg pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Telefone (opcional)"
                          className="w-full bg-gray-100 border-none rounded-lg pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Senha (mín. 6 caracteres)"
                          className="w-full bg-gray-100 border-none rounded-lg pl-11 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>

                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirmar senha"
                          className="w-full bg-gray-100 border-none rounded-lg pl-11 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.02 }}
                      whileTap={{ scale: loading ? 1 : 0.98 }}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all mt-6"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        'Criar Conta'
                      )}
                    </motion.button>
                  </form>
                </motion.div>

                {}
                <motion.div
                  className="toggle-container"
                  initial={false}
                  animate={{
                    x: isActive ? '-100%' : '0%',
                    borderRadius: isActive ? '0 150px 100px 0' : '150px 0 0 100px'
                  }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                >
                  <motion.div
                    className="toggle"
                    initial={false}
                    animate={{
                      x: isActive ? '50%' : '0%'
                    }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                  >
                    {}
                    <motion.div
                      className="toggle-panel toggle-left"
                      initial={false}
                      animate={{
                        x: isActive ? '0%' : '-200%'
                      }}
                      transition={{ duration: 0.6, ease: 'easeInOut' }}
                    >
                      <h1 className="text-3xl font-bold text-white mb-4">Bem-vindo de volta!</h1>
                      <p className="text-white/80 text-sm mb-8 px-4">
                        Entre com sua conta Zenith para acessar todos os recursos
                      </p>
                      <motion.button
                        onClick={() => handleModeChange('login')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-transparent border-2 border-white text-white font-semibold px-12 py-3 rounded-lg hover:bg-white/10 transition-all"
                      >
                        Entrar
                      </motion.button>
                    </motion.div>

                    {}
                    <motion.div
                      className="toggle-panel toggle-right"
                      initial={false}
                      animate={{
                        x: isActive ? '200%' : '0%'
                      }}
                      transition={{ duration: 0.6, ease: 'easeInOut' }}
                    >
                      <h1 className="text-3xl font-bold text-white mb-4">Olá, Gamer!</h1>
                      <p className="text-white/80 text-sm mb-8 px-4">
                        Registre-se e comece sua jornada no Zenith Gaming
                      </p>
                      <motion.button
                        onClick={() => handleModeChange('register')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-transparent border-2 border-white text-white font-semibold px-12 py-3 rounded-lg hover:bg-white/10 transition-all"
                      >
                        Criar Conta
                      </motion.button>
                    </motion.div>
                  </motion.div>
                </motion.div>

              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
