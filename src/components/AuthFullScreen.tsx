import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Phone, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';
import { isEmailFromTrustedProvider } from '../utils/emailValidation';
import { validateBrazilianPhone, formatBrazilianPhone, normalizePhone } from '../utils/phoneValidation';
import GoogleLoginButton from './GoogleLoginButton';

type AuthMode = 'login' | 'register' | 'forgot' | 'google-complete';
type LoginStep = 'credentials' | '2fa';
type RegisterStep = 'form' | 'verification';

interface AuthFullScreenProps {
  initialMode?: AuthMode;
  onClose: () => void;
}

const AuthFullScreen: React.FC<AuthFullScreenProps> = ({ initialMode = 'login', onClose }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [tempToken2FA, setTempToken2FA] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [buttonError, setButtonError] = useState('');
  const [buttonSuccess, setButtonSuccess] = useState('');
  const [success, setSuccess] = useState('');
  const [googleError, setGoogleError] = useState('');
  
  
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
  
  // Estados para completar registro Google
  const [googleToken, setGoogleToken] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');

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
    setLoginStep('credentials');
    setTempToken2FA('');
    setTwoFACode('');
    setGoogleError('');
    setGoogleToken('');
    setGoogleEmail('');
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
        
        if (result.requires2FA) {
          setTempToken2FA(result.tempToken);
          setLoginStep('2fa');
          setButtonSuccess('Código enviado para seu email!');
        } else {
          setButtonSuccess('Login realizado!');
          setTimeout(() => {
            onClose();
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
    setError('');
    setButtonError('');
    setButtonSuccess('');
    
    if (twoFACode.length !== 8) {
      setButtonError('O código deve ter 8 dígitos');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Enviando verificação 2FA:', { code: twoFACode, tempTokenLength: tempToken2FA?.length });
      
      
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
      
      console.log('Resposta 2FA:', response.data);
      
      if (response.data.success) {
        
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        
        setButtonSuccess('Login confirmado!');
        setTimeout(() => {
          onClose();
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

  // Função para completar registro Google
  const handleCompleteGoogleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setButtonError('');
    setButtonSuccess('');

    try {
      if (!phone || phone.length < 10) {
        setButtonError('Telefone inválido');
        setTimeout(() => setButtonError(''), 3000);
        setLoading(false);
        return;
      }

      const phoneValidation = validateBrazilianPhone(phone);
      if (!phoneValidation.valid) {
        setButtonError('Telefone inválido');
        setTimeout(() => setButtonError(''), 3000);
        setLoading(false);
        return;
      }

      const API_URL = import.meta.env.VITE_CHAT_API_URL;
      
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

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        setButtonSuccess('Tudo pronto!');
        setTimeout(() => {
          onClose();
          window.location.href = '/';
        }, 1500);
      } else {
        setButtonError(response.data.error || 'Erro ao completar');
        setTimeout(() => setButtonError(''), 3000);
      }
    } catch (err: any) {
      console.error('Erro ao completar registro Google:', err);
      setButtonError(err.response?.data?.error || 'Erro ao completar');
      setTimeout(() => setButtonError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Callback para quando usuário precisa completar info
  const handleGoogleNeedsAdditionalInfo = (token: string, email: string) => {
    setGoogleToken(token);
    setGoogleEmail(email);
    setEmail(email);
    setMode('google-complete');
    setError('');
    setSuccess('');
    setButtonError('');
    setButtonSuccess('');
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
            {mode === 'login' && loginStep === 'credentials' && (
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

                  {/* Divisor OU */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-gray-50 text-gray-500 font-medium">ou</span>
                    </div>
                  </div>

                  {/* Botão Google */}
                  <GoogleLoginButton
                    onSuccess={() => {
                      setButtonSuccess('Acesso confirmado!');
                      setTimeout(() => {
                        onClose();
                      }, 1500);
                    }}
                    onError={(error) => {
                      setGoogleError(error);
                      setTimeout(() => setGoogleError(''), 3000);
                    }}
                    onNeedsAdditionalInfo={handleGoogleNeedsAdditionalInfo}
                    disabled={loading}
                  />

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
            {mode === 'login' && loginStep === '2fa' && (
              <motion.div
                key="login-2fa"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Autenticação 2FA</h1>
                  <p className="text-gray-600 text-sm">
                    Enviamos um código de 8 dígitos para<br />
                    <strong className="text-blue-600">{email}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerify2FA} className="space-y-4">
                  <div>
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
                      className="w-full bg-white border-2 border-blue-300 rounded-xl px-4 py-4 text-center text-3xl font-mono tracking-widest text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      autoFocus
                      required
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Digite o código de 8 dígitos
                    </p>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || twoFACode.length !== 8 || !!buttonError || !!buttonSuccess}
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
                          Verificando...
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
                        <span key="default">Verificar Código</span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <div className="text-center pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginStep('credentials');
                        setTwoFACode('');
                        setButtonError('');
                        setButtonSuccess('');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors flex items-center gap-2 mx-auto"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar para o login
                    </button>
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
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Criar Conta</h1>
                  <p className="text-gray-600 text-sm">Preencha seus dados</p>
                </div>

                <form onSubmit={handleSendVerificationCode} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nome completo"
                      className="w-full bg-white border border-gray-300 rounded-xl pl-12 pr-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>

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
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
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
                      placeholder="Senha (mín. 6 caracteres)"
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

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirmar senha"
                      className="w-full bg-white border border-gray-300 rounded-xl pl-12 pr-12 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
                        ? 'bg-red-600 hover:bg-red-700' 
                        : buttonSuccess
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                    } text-white shadow-md`}
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
                    <p className="text-gray-600 text-sm">
                      Já tem uma conta?{' '}
                      <button
                        type="button"
                        onClick={() => handleModeChange('login')}
                        className="text-blue-600 hover:text-blue-700 font-semibold"
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
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Verifique seu Email</h1>
                  <p className="text-gray-600 text-sm">
                    Enviamos um código de 6 dígitos para<br />
                    <strong className="text-blue-600">{email}</strong>
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
                      className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-6 text-center text-4xl font-mono tracking-widest text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      autoFocus
                      required
                    />
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      Digite o código de 6 dígitos
                    </p>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md transition-all"
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
                      className="flex-1 bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-all"
                    >
                      Voltar
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={handleResendCode}
                      disabled={countdown > 0 || loading}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 bg-blue-50 text-blue-600 font-semibold py-3 rounded-xl border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {countdown > 0 ? `Reenviar (${countdown}s)` : 'Reenviar'}
                    </motion.button>
                  </div>

                  <p className="text-xs text-gray-600 text-center">
                    O código expira em 15 minutos
                  </p>
                </form>
              </motion.div>
            )}

            {/* Completar Cadastro Google */}
            {mode === 'google-complete' && (
              <motion.div
                key="google-complete"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
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
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete seu Cadastro</h1>
                  <p className="text-gray-600 text-sm mb-3">
                    Conta Google vinculada
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                    <span className="text-sm font-medium text-purple-700">{googleEmail}</span>
                  </div>
                </div>

                <form onSubmit={handleCompleteGoogleRegistration} className="space-y-4">
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
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
                      placeholder="Senha (opcional, mín. 6 caracteres)"
                      className="w-full bg-white border border-gray-300 rounded-xl pl-12 pr-12 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 rounded-xl p-3.5">
                    <div className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 mt-0.5">
                        <Lock className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        <strong className="text-blue-700">Dica:</strong> Defina uma senha para fazer login sem o Google no futuro. É opcional, mas recomendado!
                      </p>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || !phone || !!buttonError || !!buttonSuccess}
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
                          Completando...
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
                        <span key="default">Completar Cadastro</span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <div className="text-center pt-4">
                    <button
                      type="button"
                      onClick={() => handleModeChange('login')}
                      className="text-gray-600 hover:text-gray-800 font-medium text-sm transition-colors flex items-center gap-2 mx-auto"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar ao login
                    </button>
                  </div>
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
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
                    {resetStep === 'email' && <Mail className="w-8 h-8 text-white" />}
                    {resetStep === 'code' && <ShieldCheck className="w-8 h-8 text-white" />}
                    {resetStep === 'password' && <Lock className="w-8 h-8 text-white" />}
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {resetStep === 'email' && 'Recuperar Senha'}
                    {resetStep === 'code' && 'Verifique seu Email'}
                    {resetStep === 'password' && 'Nova Senha'}
                  </h1>
                  <p className="text-gray-600 text-sm">
                    {resetStep === 'email' && 'Digite seu email para receber o código'}
                    {resetStep === 'code' && (
                      <>
                        Enviamos um código de 8 dígitos para<br />
                        <strong className="text-blue-600">{email}</strong>
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
                      className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3"
                    >
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-green-700">{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {resetStep === 'email' && (
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full bg-white border border-gray-300 rounded-xl pl-12 pr-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                        className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-6 text-center text-3xl font-mono tracking-widest text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        autoFocus
                        required
                      />
                      <p className="text-xs text-gray-600 text-center">
                        Digite o código de 8 dígitos
                      </p>
                    </>
                  )}

                  {resetStep === 'password' && (
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nova senha (mín. 6 caracteres)"
                        className="w-full bg-white border border-gray-300 rounded-xl pl-12 pr-12 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        autoFocus
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
                    className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    {resetStep === 'email' ? 'Voltar ao Login' : 'Voltar'}
                  </motion.button>

                  {resetStep === 'code' && (
                    <p className="text-xs text-gray-600 text-center">
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
