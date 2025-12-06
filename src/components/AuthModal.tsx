import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Phone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { isEmailFromTrustedProvider } from '../utils/emailValidation';
import { validateBrazilianPhone, formatBrazilianPhone, normalizePhone } from '../utils/phoneValidation';
import GoogleLoginButton from './GoogleLoginButton';
import './AuthModal.css';

type AuthMode = 'login' | 'register' | 'forgot' | 'google-complete';
type LoginStep = 'credentials' | '2fa';
type RegisterStep = 'form' | 'verification';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [tempToken2FA, setTempToken2FA] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buttonError, setButtonError] = useState(''); 
  const [buttonSuccess, setButtonSuccess] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState(''); // Estados separados para "Reenviar"
  const [resendSuccess, setResendSuccess] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false); // Estados separados para GoogleLoginButton
  const [googleError, setGoogleError] = useState('');
  const [googleSuccess, setGoogleSuccess] = useState('');
  
  useEffect(() => {
    if (buttonError) {
      const timer = setTimeout(() => {
        setButtonError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [buttonError]);
  
  useEffect(() => {
    if (buttonSuccess) {
      const timer = setTimeout(() => {
        setButtonSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [buttonSuccess]);
  
  useEffect(() => {
    if (resendError) {
      const timer = setTimeout(() => {
        setResendError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [resendError]);
  
  useEffect(() => {
    if (resendSuccess) {
      const timer = setTimeout(() => {
        setResendSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [resendSuccess]);
  
  useEffect(() => {
    if (googleError) {
      const timer = setTimeout(() => {
        setGoogleError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [googleError]);
  
  useEffect(() => {
    if (googleSuccess) {
      const timer = setTimeout(() => {
        setGoogleSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [googleSuccess]);
  
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  
  
  const [registerStep, setRegisterStep] = useState<RegisterStep>('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'password'>('email');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [googleToken, setGoogleToken] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');

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
    setButtonError('');
    setButtonSuccess('');
    setResetStep('email');
    setResetToken('');
    setRegisterStep('form');
    setVerificationCode('');
    setVerificationToken('');
    setCountdown(0);
    setLoginStep('credentials');
    setTempToken2FA('');
    setTwoFACode('');
  };

  
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
    setButtonError('');
    setButtonSuccess('');
    
    if (!email || !password) {
      setButtonError('Preencha todos os campos');
      return;
    }
    
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        
        if (result.requires2FA) {
          setTempToken2FA(result.tempToken);
          setLoginStep('2fa');
          setButtonSuccess('Código enviado para seu email!');
        } else {
          setButtonSuccess('Login realizado!');
          setTimeout(() => {
            handleClose();
            navigate('/');
          }, 1500);
        }
      } else {
        setButtonError(result.error || 'Erro ao fazer login');
      }
    } catch (err) {
      setButtonError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setButtonError('');
    setButtonSuccess('');
    
    if (twoFACode.length !== 8) {
      setButtonError('O código deve ter 8 dígitos');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/verify-2fa-login`,
        {
          code: twoFACode,
          tempToken: tempToken2FA
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        
        setButtonSuccess('Login confirmado!');
        setTimeout(() => {
          handleClose();
          window.location.reload(); 
        }, 1500);
      } else {
        setButtonError(response.data.message || 'Código inválido');
      }
    } catch (err: any) {
      setButtonError(err.response?.data?.message || 'Erro ao verificar código');
    } finally {
      setLoading(false);
    }
  };

  
  const handleSendVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setButtonError('');
    setButtonSuccess('');
    
    
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
    setButtonError('');
    setButtonSuccess('');

    if (verificationCode.length !== 6) {
      setButtonError('Digite o código de 6 dígitos');
      return;
    }

    setLoading(true);
    try {
      
      const verifyResponse = await axios.post(
        `${import.meta.env.VITE_CHAT_API_URL}/api/auth/verify-email-code`,
        { email, code: verificationCode }
      );

      if (verifyResponse.data.success) {
        setVerificationToken(verifyResponse.data.verificationToken);
        setButtonSuccess('Email verificado!');

        const phoneNormalized = normalizePhone(phone);
        
        const result = await registerUser(name, email, password, phoneNormalized);
        
        if (result.success) {
          setButtonSuccess('Conta criada com sucesso!');
          setTimeout(() => {
            handleClose();
            navigate('/');
          }, 1000);
        } else {
          setButtonError(result.error || 'Erro ao criar conta');
        }
      } else {
        setButtonError(verifyResponse.data.error || verifyResponse.data.message || 'Código inválido');
      }
    } catch (err: any) {
      setButtonError(err.response?.data?.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  
  const handleResendCode = async () => {
    if (countdown > 0) return;

    setResendError('');
    setResendSuccess('');
    setResendLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_CHAT_API_URL}/api/auth/resend-verification-code`,
        { email }
      );
      setResendLoading(false);
      setResendSuccess('Novo código enviado!');
      setCountdown(60);
    } catch (err: any) {
      setResendLoading(false);
      setResendError(err.response?.data?.message || 'Erro ao reenviar código');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setButtonError('');
    setButtonSuccess('');
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
          const token = response.data.data?.resetToken;
           
           
          
          if (!token) {
            setButtonError('Erro ao obter token de redefinição');
            return;
          }
          
          setResetToken(token);
          setButtonSuccess('Código verificado!');
          setTimeout(() => {
            setResetStep('password');
            setButtonSuccess('');
          }, 1500);
        }
      } else if (resetStep === 'password') {
        if (!resetToken) {
          setButtonError('Token de redefinição não encontrado');
          return;
        }
        
        if (!newPassword || newPassword.length < 6) {
          setButtonError('Senha deve ter no mínimo 6 caracteres');
          return;
        }
        
        const response = await axios.post(
          `${import.meta.env.VITE_CHAT_API_URL}/api/auth/reset-password`,
          {
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

  const handleCompleteGoogleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setButtonError('');
    setButtonSuccess('');

    try {
      if (!phone || !validateBrazilianPhone(phone)) {
        setLoading(false);  // Desabilita loading ANTES de setar erro
        setButtonError('Telefone inválido');
        return;
      }

      if (password && password.trim().length > 0 && password.trim().length < 6) {
        setLoading(false);  // Desabilita loading ANTES de setar erro
        setButtonError('Senha muito curta');
        return;
      }

      const API_URL = (import.meta as any).env.VITE_CHAT_API_URL;
      
      const payload: any = {
        googleToken,
        phone: normalizePhone(phone)
      };
      
      if (password && password.trim().length >= 6) {
        payload.password = password;
      }

      const response = await axios.post(
        `${API_URL}/api/auth/google/complete-registration`,
        payload
      );

      if (response.data.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        setLoading(false);  // Desabilita loading ANTES de setar sucesso
        setButtonSuccess('Tudo pronto!');
        
        setTimeout(() => {
          onClose();
          window.location.href = '/';
        }, 1500);
      } else {
        setLoading(false);  // Desabilita loading ANTES de setar erro
        setButtonError(response.data.error || 'Erro ao completar');
      }
    } catch (err: any) {
      setLoading(false);
      setButtonError(err.response?.data?.error || 'Erro ao completar');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleNeedsAdditionalInfo = (token: string, email: string) => {
    setGoogleToken(token);
    setGoogleEmail(email);
    setEmail(email); // Pre-fill email
    setMode('google-complete');
    setButtonError('');
    setButtonSuccess('');
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
          <motion.div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ 
                type: 'spring', 
                damping: 30, 
                stiffness: 400,
                mass: 0.8
              }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto will-change-transform"
              style={{ maxHeight: '90vh', transform: 'translateZ(0)' }}
            >
              {}
              <motion.button
                onClick={handleClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </motion.button>

              <div className={`relative min-h-[500px] md:min-h-[550px] transition-all duration-600 ${
                isActive || mode === 'google-complete' ? 'auth-modal-active' : ''
              }`}>
                
                {}
                <motion.div
                  className={`form-container sign-in ${isActive || mode === 'google-complete' ? '' : 'active'}`}
                  initial={false}
                  animate={{
                    x: (isActive || mode === 'google-complete') ? '100%' : '0%',
                    opacity: (isActive || mode === 'google-complete') ? 0 : 1,
                    zIndex: (isActive || mode === 'google-complete') ? 1 : 2
                  }}
                  transition={{ 
                    type: 'tween',
                    duration: 0.4, 
                    ease: [0.4, 0, 0.2, 1],
                    zIndex: { delay: isActive ? 0.4 : 0 }
                  }}
                  style={{ 
                    transform: 'translateZ(0)',
                    willChange: 'transform, opacity'
                  }}
                >
                  <form onSubmit={mode === 'login' ? handleLogin : mode === 'forgot' ? handleForgotPassword : (e) => e.preventDefault()} className="flex flex-col items-center justify-center h-full px-10">
                    <AnimatePresence mode="wait">
                    {mode === 'login' && loginStep === 'credentials' && (
                      <motion.div
                        key="login-content"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="w-full flex flex-col items-center"
                      >
                      <>
                        {}
                        <div className="mb-4">
                          <User className="w-16 h-16 text-blue-600 mx-auto" />
                        </div>

                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Bem-vindo de Volta!</h1>
                        <p className="text-sm text-gray-600 mb-6 text-center">Entre com sua conta Zenith</p>

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
                          disabled={loading || !!buttonError || !!buttonSuccess}
                          whileHover={{ scale: (loading || buttonError || buttonSuccess) ? 1 : 1.02 }}
                          whileTap={{ scale: (loading || buttonError || buttonSuccess) ? 1 : 0.98 }}
                          className={`w-full font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all ${
                            buttonError 
                              ? 'bg-red-500 hover:bg-red-600' 
                              : buttonSuccess
                                ? 'bg-green-500 hover:bg-green-600'
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                          } text-white`}
                        >
                          <AnimatePresence mode="wait">
                            {loading ? (
                              <motion.div
                                key="loading"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center gap-2"
                              >
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Entrando...
                              </motion.div>
                            ) : buttonSuccess ? (
                              <motion.div
                                key="success"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center gap-2"
                              >
                                <CheckCircle className="w-5 h-5" />
                                {buttonSuccess}
                              </motion.div>
                            ) : buttonError ? (
                              <motion.div
                                key="error"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center gap-2"
                              >
                                <AlertCircle className="w-5 h-5" />
                                {buttonError}
                              </motion.div>
                            ) : (
                              <motion.span
                                key="default"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                              >
                                Entrar
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      </>
                      </motion.div>
                    )}

                    {mode === 'login' && loginStep === '2fa' && (
                      <motion.div
                        key="2fa-content"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="w-full flex flex-col items-center"
                      >
                      <>
                        {}
                        <div className="mb-4">
                          <ShieldCheck className="w-16 h-16 text-blue-600 mx-auto" />
                        </div>

                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Autenticação 2FA</h1>
                        <p className="text-sm text-gray-600 mb-6 text-center">
                          Enviamos um código de 8 dígitos para<br />
                          <strong className="text-blue-600">{email}</strong>
                        </p>

                        {}
                        <div className="w-full mb-4">
                          <input
                            type="text"
                            value={twoFACode}
                            onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && twoFACode.length === 8) {
                                handleVerify2FA(e as any);
                              }
                            }}
                            placeholder="00000000"
                            maxLength={8}
                            className="w-full bg-gray-100 border-2 border-blue-300 rounded-lg px-4 py-4 text-center text-3xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                            required
                          />
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            Digite o código de 8 dígitos
                          </p>
                        </div>

                        {}
                        <div className="w-full space-y-3">
                          <motion.button
                            type="button"
                            onClick={handleVerify2FA}
                            disabled={loading || twoFACode.length !== 8 || !!buttonError || !!buttonSuccess}
                            whileHover={{ scale: (loading || buttonError || buttonSuccess || twoFACode.length !== 8) ? 1 : 1.02 }}
                            whileTap={{ scale: (loading || buttonError || buttonSuccess || twoFACode.length !== 8) ? 1 : 0.98 }}
                            className={`w-full font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all ${
                              buttonError 
                                ? 'bg-red-500 hover:bg-red-600' 
                                : buttonSuccess
                                  ? 'bg-green-500 hover:bg-green-600'
                                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                            } text-white`}
                          >
                            <AnimatePresence mode="wait">
                              {loading ? (
                                <motion.div
                                  key="loading"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex items-center gap-2"
                                >
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  Verificando...
                                </motion.div>
                              ) : buttonSuccess ? (
                                <motion.div
                                  key="success"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex items-center gap-2"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                  {buttonSuccess}
                                </motion.div>
                              ) : buttonError ? (
                                <motion.div
                                  key="error"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex items-center gap-2"
                                >
                                  <AlertCircle className="w-5 h-5" />
                                  {buttonError}
                                </motion.div>
                              ) : (
                                <motion.span
                                  key="default"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  Verificar Código
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </motion.button>

                          <button
                            type="button"
                            onClick={() => {
                              setLoginStep('credentials');
                              setTwoFACode('');
                              setButtonError('');
                              setButtonSuccess('');
                            }}
                            className="w-full text-sm text-gray-600 hover:text-blue-600 py-2 transition-colors"
                          >
                            ← Voltar para o login
                          </button>
                        </div>
                      </>
                      </motion.div>
                    )}

                    {mode === 'forgot' && (
                      <motion.div
                        key="forgot-content"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="w-full flex flex-col items-center"
                      >
                      <>
                        {}
                        <div className="mb-4">
                          {resetStep === 'email' && <Mail className="w-16 h-16 text-blue-600 mx-auto" />}
                          {resetStep === 'code' && <ShieldCheck className="w-16 h-16 text-blue-600 mx-auto" />}
                          {resetStep === 'password' && <Lock className="w-16 h-16 text-blue-600 mx-auto" />}
                        </div>

                        <h1 className="text-3xl font-bold text-gray-800 mb-2">
                          {resetStep === 'email' && 'Recuperar Senha'}
                          {resetStep === 'code' && 'Verifique seu Email'}
                          {resetStep === 'password' && 'Nova Senha'}
                        </h1>
                        
                        <p className="text-sm text-gray-600 mb-6 text-center">
                          {resetStep === 'email' && 'Digite seu email para receber o código'}
                          {resetStep === 'code' && (
                            <>
                              Enviamos um código de 8 dígitos para<br />
                              <strong className="text-blue-600">{email}</strong>
                            </>
                          )}
                          {resetStep === 'password' && 'Defina uma nova senha para sua conta'}
                        </p>

                        {}
                        <div className="w-full mb-4">
                          {resetStep === 'email' && (
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="w-full bg-gray-100 border-none rounded-lg pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="w-full bg-gray-100 border-2 border-blue-300 rounded-lg px-4 py-4 text-center text-3xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                                required
                              />
                              <p className="text-xs text-gray-500 mt-2 text-center">
                                Digite o código de 8 dígitos
                              </p>
                            </>
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
                                autoFocus
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

                        {}
                        <div className="w-full space-y-3">
                          <motion.button
                            type="submit"
                            disabled={loading || !!buttonError || !!buttonSuccess}
                            whileHover={{ scale: (loading || buttonError || buttonSuccess) ? 1 : 1.02 }}
                            whileTap={{ scale: (loading || buttonError || buttonSuccess) ? 1 : 0.98 }}
                            className={`w-full font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all ${
                              buttonError 
                                ? 'bg-red-500 hover:bg-red-600' 
                                : buttonSuccess
                                  ? 'bg-green-500 hover:bg-green-600'
                                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                            } text-white`}
                          >
                            <AnimatePresence mode="wait">
                              {loading ? (
                                <motion.div
                                  key="loading"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex items-center gap-2"
                                >
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  Processando...
                                </motion.div>
                              ) : buttonSuccess ? (
                                <motion.div
                                  key="success"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex items-center gap-2"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                  {buttonSuccess}
                                </motion.div>
                              ) : buttonError ? (
                                <motion.div
                                  key="error"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex items-center gap-2"
                                >
                                  <AlertCircle className="w-5 h-5" />
                                  {buttonError}
                                </motion.div>
                              ) : (
                                <motion.span
                                  key="default"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  {resetStep === 'email' && 'Enviar Código'}
                                  {resetStep === 'code' && 'Verificar Código'}
                                  {resetStep === 'password' && 'Redefinir Senha'}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </motion.button>

                          <motion.button
                            type="button"
                            onClick={() => resetStep === 'email' ? handleModeChange('login') : setResetStep('email')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-all"
                          >
                            {resetStep === 'email' ? 'Voltar ao Login' : 'Voltar'}
                          </motion.button>
                        </div>

                        {resetStep === 'code' && (
                          <p className="text-xs text-gray-500 mt-4 text-center">
                            O código expira em 15 minutos
                          </p>
                        )}
                      </>
                      </motion.div>
                    )}

                    </AnimatePresence>
                  </form>
                </motion.div>

                {}
                <motion.div
                  className={`form-container sign-up ${isActive || mode === 'google-complete' ? 'active' : ''}`}
                  initial={false}
                  animate={{
                    x: (isActive || mode === 'google-complete') ? '100%' : '0%',
                    opacity: (isActive || mode === 'google-complete') ? 1 : 0,
                    zIndex: (isActive || mode === 'google-complete') ? 5 : 1
                  }}
                  transition={{ 
                    type: 'tween',
                    duration: 0.4, 
                    ease: [0.4, 0, 0.2, 1],
                    zIndex: { delay: isActive ? 0 : 0.4 }
                  }}
                  style={{ 
                    transform: 'translateZ(0)',
                    willChange: 'transform, opacity'
                  }}
                >
                  {mode === 'google-complete' ? (
                    <form className="flex flex-col items-center justify-center h-full px-10">
                    {}
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    </div>

                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Complete seu Cadastro</h1>
                    <p className="text-sm text-gray-600 mb-6 text-center">
                      Conta Google vinculada<br />
                      <strong className="text-purple-600">{googleEmail}</strong>
                    </p>

                    <div className="w-full space-y-3">
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(formatBrazilianPhone(e.target.value))}
                          placeholder="(11) 99999-9999"
                          className="w-full bg-gray-100 border-none rounded-lg pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          autoFocus
                          required
                        />
                      </div>

                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Senha (opcional - min. 6 caracteres)"
                          className="w-full bg-gray-100 border-none rounded-lg pl-11 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="w-full mt-6 space-y-3">
                      <motion.button
                        type="button"
                        onClick={handleCompleteGoogleRegistration}
                        disabled={loading || !phone}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Completando...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            <span>Completar Cadastro</span>
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        type="button"
                        onClick={() => {
                          handleModeChange('login');
                          setGoogleToken('');
                          setGoogleEmail('');
                          setPhone('');
                          setPassword('');
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-all"
                      >
                        Voltar para Login
                      </motion.button>
                    </div>
                    </form>
                  ) : registerStep === 'form' ? (
                    <form onSubmit={handleSendVerificationCode} className="flex flex-col items-center justify-center h-full px-10">
                    {}
                    <div className="mb-4">
                      <User className="w-16 h-16 text-purple-600 mx-auto" />
                    </div>

                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Criar Conta</h1>
                    <p className="text-sm text-gray-600 mb-6 text-center">Junte-se à comunidade Zenith</p>

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
                      disabled={loading || !!buttonError || !!buttonSuccess}
                      whileHover={{ scale: (loading || buttonError || buttonSuccess) ? 1 : 1.02 }}
                      whileTap={{ scale: (loading || buttonError || buttonSuccess) ? 1 : 0.98 }}
                      className={`w-full font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all mt-6 ${
                        buttonError 
                          ? 'bg-red-500 hover:bg-red-600' 
                          : buttonSuccess
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                      } text-white`}
                    >
                      <AnimatePresence mode="wait">
                        {loading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2"
                          >
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Enviando código...
                          </motion.div>
                        ) : buttonSuccess ? (
                          <motion.div
                            key="success"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2"
                          >
                            <CheckCircle className="w-5 h-5" />
                            {buttonSuccess}
                          </motion.div>
                        ) : buttonError ? (
                          <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2"
                          >
                            <AlertCircle className="w-5 h-5" />
                            {buttonError}
                          </motion.div>
                        ) : (
                          <motion.span
                            key="default"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            Criar Conta
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </form>
                  ) : (
                    
                    <motion.form
                      onSubmit={handleVerifyAndRegister}
                      initial={{ x: 100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -100, opacity: 0 }}
                      transition={{ duration: 0.6, ease: 'easeInOut' }}
                      className="flex flex-col items-center justify-center h-full px-10"
                    >
                      <div className="mb-4">
                        <ShieldCheck className="w-16 h-16 text-blue-600 mx-auto" />
                      </div>
                      
                      <h1 className="text-3xl font-bold text-gray-800 mb-2">Verifique seu Email</h1>

    <div className="w-full mb-4">
      <input
        type="text"
        value={verificationCode}
        onChange={(e) => {
          const value = e.target.value.replace(/\D/g, '').slice(0, 6);
          setVerificationCode(value);
        }}
        placeholder="000000"
        maxLength={6}
        className="w-full bg-gray-100 border-2 border-blue-300 rounded-lg px-4 py-4 text-center text-3xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        autoFocus
        required
      />
      <p className="text-xs text-gray-500 mt-2 text-center">
        Digite o código de 6 dígitos
      </p>
    </div>

    <div className="w-full space-y-3">
      <motion.button
        type="submit"
        disabled={loading || verificationCode.length !== 6 || !!buttonError || !!buttonSuccess}
        whileHover={{ scale: (loading || buttonError || buttonSuccess || verificationCode.length !== 6) ? 1 : 1.02 }}
        whileTap={{ scale: (loading || buttonError || buttonSuccess || verificationCode.length !== 6) ? 1 : 0.98 }}
        className={`w-full font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all ${
          buttonError 
            ? 'bg-red-500 hover:bg-red-600' 
            : buttonSuccess
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
        } text-white`}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              Verificando...
            </motion.div>
          ) : buttonSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {buttonSuccess}
            </motion.div>
          ) : buttonError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5" />
              {buttonError}
            </motion.div>
          ) : (
            <motion.span
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Verificar e Criar Conta
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <div className="flex gap-2">
        <motion.button
          type="button"
          onClick={() => setRegisterStep('form')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-all"
        >
          Voltar
        </motion.button>

        <motion.button
          type="button"
          onClick={handleResendCode}
          disabled={countdown > 0 || resendLoading || !!resendError || !!resendSuccess}
          whileHover={{ scale: (countdown > 0 || resendLoading || resendError || resendSuccess) ? 1 : 1.02 }}
          whileTap={{ scale: (countdown > 0 || resendLoading || resendError || resendSuccess) ? 1 : 0.98 }}
          className={`flex-1 font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 ${
            resendError 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : resendSuccess
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          <AnimatePresence mode="wait">
            {resendLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                Reenviando...
              </motion.div>
            ) : resendSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {resendSuccess}
              </motion.div>
            ) : resendError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                {resendError}
              </motion.div>
            ) : (
              <motion.span
                key="default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {countdown > 0 ? `Reenviar (${countdown}s)` : 'Reenviar Código'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>

                      <p className="text-xs text-gray-500 mt-4 text-center">
                        O código expira em 15 minutos
                      </p>
                    </motion.form>
                  )}
                </motion.div>

                {}
                <div className="toggle-container">

                  <div className="toggle">
                    {}
                    <div className="toggle-panel toggle-left">
                      {mode === 'google-complete' ? (
                        <>
                          <svg className="w-20 h-20 mx-auto mb-4" viewBox="0 0 24 24">
                            <path
                              fill="#ffffff"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#ffffff"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#ffffff"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#ffffff"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                          <h1 className="text-3xl font-bold text-white mb-4">Quase lá!</h1>
                          <p className="text-white/90 text-sm mb-4 px-8 leading-relaxed">
                            Sua conta Google foi vinculada com sucesso!
                          </p>
                          <p className="text-white/70 text-xs px-8 leading-relaxed">
                            Complete seu cadastro com seu telefone para finalizar. A senha é opcional e permite que você faça login sem o Google no futuro.
                          </p>
                        </>
                      ) : (
                        <>
                          <h1 className="text-3xl font-bold text-white mb-4">Bem-vindo de volta!</h1>
                          <p className="text-white/80 text-sm mb-8 px-4">
                            Entre com sua conta Zenith para acessar todos os recursos
                          </p>
                          <button
                            onClick={() => handleModeChange('login')}
                            className="bg-transparent border-2 border-white text-white font-semibold px-12 py-3 rounded-lg hover:bg-white/10 transition-all"
                          >
                            Entrar
                          </button>
                          
                          {/* Divisor */}
                          <div className="relative my-6 w-full max-w-xs">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-white/30"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                              <span className="px-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs">ou</span>
                            </div>
                          </div>
                          
                          {/* Botão Google */}
                          <div className="w-full max-w-xs px-4">
                            <GoogleLoginButton
                              onSuccess={() => {
                                setGoogleSuccess('Acesso confirmado!');
                                setTimeout(() => {
                                  handleClose();
                                }, 1500);
                              }}
                              onError={(error) => {
                                setGoogleError(error);
                              }}
                              onNeedsAdditionalInfo={handleGoogleNeedsAdditionalInfo}
                              disabled={googleLoading}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {}
                    <div className="toggle-panel toggle-right">
                      {mode === 'google-complete' ? (
                        <>
                          <svg className="w-20 h-20 mx-auto mb-4" viewBox="0 0 24 24">
                            <path
                              fill="#ffffff"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#ffffff"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#ffffff"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#ffffff"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                          <h1 className="text-3xl font-bold text-white mb-4">Quase lá!</h1>
                          <p className="text-white/90 text-sm mb-4 px-8 leading-relaxed">
                            Sua conta Google foi vinculada com sucesso!
                          </p>
                          <p className="text-white/70 text-xs px-8 leading-relaxed">
                            Complete seu cadastro com seu telefone para finalizar. A senha é opcional e permite que você faça login sem o Google no futuro.
                          </p>
                        </>
                      ) : (
                        <>
                          <h1 className="text-3xl font-bold text-white mb-4">Olá, Gamer!</h1>
                          <p className="text-white/80 text-sm mb-8 px-4">
                            Registre-se e comece sua jornada no Zenith Gaming
                          </p>
                          <button
                            onClick={() => handleModeChange('register')}
                            className="bg-transparent border-2 border-white text-white font-semibold px-12 py-3 rounded-lg hover:bg-white/10 transition-all"
                          >
                            Criar Conta
                          </button>
                        </>
                      )}
                      
                      {mode !== 'google-complete' && (
                        <>
                          {/* Divisor */}
                          <div className="relative my-6 w-full max-w-xs">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-white/30"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                              <span className="px-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs">ou</span>
                            </div>
                          </div>
                          
                          {/* Botão Google */}
                          <div className="w-full max-w-xs px-4">
                            <GoogleLoginButton
                              onSuccess={() => {
                                setGoogleSuccess('Acesso confirmado!');
                                setTimeout(() => {
                                  handleClose();
                                }, 1500);
                              }}
                              onError={(error) => {
                                setGoogleError(error);
                              }}
                              onNeedsAdditionalInfo={handleGoogleNeedsAdditionalInfo}
                              disabled={googleLoading}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
