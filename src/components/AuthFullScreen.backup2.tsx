import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Phone, ShieldCheck, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { isEmailFromTrustedProvider } from '../utils/emailValidation';
import { validateBrazilianPhone, formatBrazilianPhone, normalizePhone } from '../utils/phoneValidation';

type AuthMode = 'login' | 'register' | 'forgot';
type RegisterStep = 'form' | 'verification';

interface AuthFullScreenProps {
  initialMode?: AuthMode;
  onClose: () => void;
}

const AuthFullScreen: React.FC<AuthFullScreenProps> = ({ initialMode = 'login', onClose }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [buttonError, setButtonError] = useState('');
  const [buttonSuccess, setButtonSuccess] = useState('');
  const [success, setSuccess] = useState('');
  
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  
  
  const [registerStep, setRegisterStep] = useState<RegisterStep>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'password'>('email');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  const { login, register: registerUser } = useAuth();
  const navigate = useNavigate();

  
  useEffect(() => {
    if (buttonError) {
      const timer = setTimeout(() => setButtonError(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [buttonError]);
  
  
  useEffect(() => {
    if (buttonSuccess) {
      const timer = setTimeout(() => setButtonSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [buttonSuccess]);

  
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
    setRegisterStep('form');
    setVerificationCode('');
    setCountdown(0);
  };

  const handleModeChange = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setButtonError('');
    setButtonSuccess('');
    setSuccess('');
    
    if (!email || !password) {
      setButtonError('Preencha todos os campos');
      return;
    }
    
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        setButtonSuccess('Login realizado!');
        setTimeout(() => {
          onClose();
          navigate('/');
        }, 1500);
      } else {
        setButtonError(result.error || 'Erro ao fazer login');
      }
    } catch (err) {
      setButtonError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setButtonError('');
    setButtonSuccess('');
    setSuccess('');
    
    if (!name || !email || !password || !phone) {
      setButtonError('Preencha todos os campos');
      return;
    }
    
    if (password !== confirmPassword) {
      setButtonError('As senhas não coincidem');
      return;
    }
    
    if (password.length < 6) {
      setButtonError('Senha muito curta (mín. 6)');
      return;
    }

    if (!isEmailFromTrustedProvider(email)) {
      setButtonError('Use um provedor de email confiável');
      return;
    }

    const phoneValidation = validateBrazilianPhone(phone);
    if (!phoneValidation.valid) {
      setButtonError('Telefone inválido');
      return;
    }
    
    setLoading(true);
    try {
      const phoneNormalized = normalizePhone(phone);
      
      const response = await axios.post(
        `${import.meta.env.VITE_CHAT_API_URL}/api/auth/send-verification-code`,
        { 
          email,
          phone: phoneNormalized
        }
      );
      
      if (response.data.success) {
        setButtonSuccess('Código enviado!');
        setCountdown(60);
        setTimeout(() => {
          setRegisterStep('verification');
          setButtonSuccess('');
        }, 1500);
      }
    } catch (err: any) {
      setButtonError(err.response?.data?.message || 'Erro ao enviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (verificationCode.length !== 6) {
      setError('Digite o código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      const verifyResponse = await axios.post(
        `${import.meta.env.VITE_CHAT_API_URL}/api/auth/verify-email-code`,
        { email, code: verificationCode }
      );

      if (verifyResponse.data.success) {
        setSuccess('Email verificado!');

        const phoneNormalized = normalizePhone(phone);
        const result = await registerUser(name, email, password, phoneNormalized);
        
        if (result.success) {
          setSuccess('Conta criada com sucesso!');
          setTimeout(() => {
            onClose();
            navigate('/');
          }, 1000);
        } else {
          setError(result.error || 'Erro ao criar conta');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setError('');
    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_CHAT_API_URL}/api/auth/resend-verification-code`,
        { email }
      );
      setSuccess('Novo código enviado!');
      setCountdown(60);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao reenviar código');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setButtonError('');
    setButtonSuccess('');
    setSuccess('');
    setLoading(true);

    try {
      if (resetStep === 'email') {
        const response = await axios.post(
          `${import.meta.env.VITE_CHAT_API_URL}/api/auth/forgot-password`,
          { email }
        );
        
        if (response.data.success) {
          setButtonSuccess('Código enviado!');
          setTimeout(() => {
            setResetStep('code');
            setButtonSuccess('');
          }, 1500);
        }
      } else if (resetStep === 'code') {
        const response = await axios.post(
          `${import.meta.env.VITE_CHAT_API_URL}/api/auth/verify-reset-code`,
          { email, code: resetCode }
        );
        
        if (response.data.success) {
          setResetToken(response.data.resetToken);
          setButtonSuccess('Código verificado!');
          setTimeout(() => {
            setResetStep('password');
            setButtonSuccess('');
          }, 1500);
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
          setButtonSuccess('Senha redefinida!');
          setTimeout(() => {
            handleModeChange('login');
          }, 2000);
        }
      }
    } catch (err: any) {
      setButtonError(err.response?.data?.message || 'Erro na operação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <motion.button
            onClick={onClose}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </motion.button>
          <h2 className="text-gray-900 font-semibold text-lg">
            {mode === 'login' && 'Login'}
            {mode === 'register' && (registerStep === 'form' ? 'Criar Conta' : 'Verificação')}
            {mode === 'forgot' && 'Recuperar Senha'}
          </h2>
          <div className="w-10" /> {}
        </div>
      </div>

      {}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-6 py-8 max-w-md">
          <AnimatePresence mode="wait">
            {}
            {mode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo de Volta!</h1>
                  <p className="text-gray-600 text-sm">Entre com sua conta</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full bg-white border border-gray-300 rounded-xl pl-12 pr-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>
                  
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha"
                      className="w-full bg-white border border-gray-300 rounded-xl pl-12 pr-12 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleModeChange('forgot')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>

                  <motion.button
                    type="submit"
                    disabled={loading || !!buttonError || !!buttonSuccess}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full font-semibold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all ${
                      buttonError 
                        ? 'bg-red-500' 
                        : buttonSuccess
                          ? 'bg-green-500'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600'
                    } text-white shadow-lg`}
                  >
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.div key="loading" className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Entrando...
                        </motion.div>
                      ) : buttonSuccess ? (
                        <motion.div key="success" className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          {buttonSuccess}
                        </motion.div>
                      ) : buttonError ? (
                        <motion.div key="error" className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          {buttonError}
                        </motion.div>
                      ) : (
                        <span key="default">Entrar</span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <div className="text-center pt-4">
                    <p className="text-gray-600 text-sm">
                      Não tem uma conta?{' '}
                      <button
                        type="button"
                        onClick={() => handleModeChange('register')}
                        className="text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        Criar conta
                      </button>
                    </p>
                  </div>
                </form>
              </motion.div>
            )}

            {}
            {mode === 'register' && registerStep === 'form' && (
              <motion.div
                key="register-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 mb-4">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2">Criar Conta</h1>
                  <p className="text-gray-300 text-sm">Junte-se à comunidade Zenith</p>
                </div>

                <form onSubmit={handleSendVerificationCode} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome completo"
                      className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formatBrazilianPhone(phone)}
                      onChange={(e) => {
                        const input = e.target.value;
                        const normalized = normalizePhone(input);
                        if (normalized.length <= 11) {
                          setPhone(normalized);
                        }
                      }}
                      placeholder="(11) 98765-4321"
                      maxLength={15}
                      className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha (mín. 6 caracteres)"
                      className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl pl-12 pr-12 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirmar senha"
                      className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl pl-12 pr-12 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || !!buttonError || !!buttonSuccess}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full font-semibold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all ${
                      buttonError 
                        ? 'bg-red-500' 
                        : buttonSuccess
                          ? 'bg-green-500'
                          : 'bg-gradient-to-r from-purple-600 to-pink-600'
                    } text-white shadow-lg`}
                  >
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.div key="loading" className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Enviando código...
                        </motion.div>
                      ) : buttonSuccess ? (
                        <motion.div key="success" className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          {buttonSuccess}
                        </motion.div>
                      ) : buttonError ? (
                        <motion.div key="error" className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          {buttonError}
                        </motion.div>
                      ) : (
                        <span key="default">Criar Conta</span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <div className="text-center pt-4">
                    <p className="text-gray-300 text-sm">
                      Já tem uma conta?{' '}
                      <button
                        type="button"
                        onClick={() => handleModeChange('login')}
                        className="text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        Entrar
                      </button>
                    </p>
                  </div>
                </form>
              </motion.div>
            )}

            {}
            {mode === 'register' && registerStep === 'verification' && (
              <motion.div
                key="register-verification"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                    <ShieldCheck className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2">Verifique seu Email</h1>
                  <p className="text-gray-300 text-sm">
                    Enviamos um código de 6 dígitos para<br />
                    <strong className="text-blue-400">{email}</strong>
                  </p>
                </div>

                {}
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-200">{error}</p>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl flex items-start gap-3"
                    >
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-green-200">{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleVerifyAndRegister} className="space-y-6">
                  <div>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setVerificationCode(value);
                      }}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full bg-white/10 backdrop-blur-md border-2 border-blue-400/50 rounded-xl px-4 py-6 text-center text-4xl font-mono tracking-widest text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                      required
                    />
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      Digite o código de 6 dígitos
                    </p>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      'Verificar e Criar Conta'
                    )}
                  </motion.button>

                  <div className="flex gap-3">
                    <motion.button
                      type="button"
                      onClick={() => setRegisterStep('form')}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 bg-white/10 backdrop-blur-md text-white font-semibold py-3 rounded-xl border border-white/20"
                    >
                      Voltar
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={handleResendCode}
                      disabled={countdown > 0 || loading}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 bg-blue-500/20 text-blue-300 font-semibold py-3 rounded-xl border border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {countdown > 0 ? `Reenviar (${countdown}s)` : 'Reenviar'}
                    </motion.button>
                  </div>

                  <p className="text-xs text-gray-400 text-center">
                    O código expira em 15 minutos
                  </p>
                </form>
              </motion.div>
            )}

            {}
            {mode === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                    {resetStep === 'email' && <Mail className="w-10 h-10 text-white" />}
                    {resetStep === 'code' && <ShieldCheck className="w-10 h-10 text-white" />}
                    {resetStep === 'password' && <Lock className="w-10 h-10 text-white" />}
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {resetStep === 'email' && 'Recuperar Senha'}
                    {resetStep === 'code' && 'Verifique seu Email'}
                    {resetStep === 'password' && 'Nova Senha'}
                  </h1>
                  <p className="text-gray-300 text-sm">
                    {resetStep === 'email' && 'Digite seu email para receber o código'}
                    {resetStep === 'code' && (
                      <>
                        Enviamos um código de 8 dígitos para<br />
                        <strong className="text-blue-400">{email}</strong>
                      </>
                    )}
                    {resetStep === 'password' && 'Defina uma nova senha para sua conta'}
                  </p>
                </div>

                {}
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-200">{error}</p>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl flex items-start gap-3"
                    >
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-green-200">{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {resetStep === 'email' && (
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                        required
                      />
                    </div>
                  )}

                  {resetStep === 'code' && (
                    <>
                      <input
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="00000000"
                        maxLength={8}
                        className="w-full bg-white/10 backdrop-blur-md border-2 border-blue-400/50 rounded-xl px-4 py-6 text-center text-3xl font-mono tracking-widest text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                        required
                      />
                      <p className="text-xs text-gray-400 text-center">
                        Digite o código de 8 dígitos
                      </p>
                    </>
                  )}

                  {resetStep === 'password' && (
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nova senha (mín. 6 caracteres)"
                        className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl pl-12 pr-12 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading || !!buttonError || !!buttonSuccess}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full font-semibold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all ${
                      buttonError 
                        ? 'bg-red-500' 
                        : buttonSuccess
                          ? 'bg-green-500'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600'
                    } text-white shadow-lg`}
                  >
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.div key="loading" className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processando...
                        </motion.div>
                      ) : buttonSuccess ? (
                        <motion.div key="success" className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          {buttonSuccess}
                        </motion.div>
                      ) : buttonError ? (
                        <motion.div key="error" className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          {buttonError}
                        </motion.div>
                      ) : (
                        <span key="default">
                          {resetStep === 'email' && 'Enviar Código'}
                          {resetStep === 'code' && 'Verificar Código'}
                          {resetStep === 'password' && 'Redefinir Senha'}
                        </span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => resetStep === 'email' ? handleModeChange('login') : setResetStep('email')}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-white/10 backdrop-blur-md text-white font-semibold py-3 rounded-xl border border-white/20"
                  >
                    {resetStep === 'email' ? 'Voltar ao Login' : 'Voltar'}
                  </motion.button>

                  {resetStep === 'code' && (
                    <p className="text-xs text-gray-400 text-center">
                      O código expira em 15 minutos
                    </p>
                  )}
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AuthFullScreen;
