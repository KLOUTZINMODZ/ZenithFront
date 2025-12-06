import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Check, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import chatApi from '../services/chatApi';
import bannerImage from '../image/bannerzenithbyklouts.jpeg';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();


  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
        -webkit-text-fill-color: white !important;
        background-color: transparent !important;
        background-image: none !important;
        transition: background-color 5000s ease-in-out 0s !important;
      }
      
      input:autofill {
        background-color: transparent !important;
        background-image: none !important;
        color: white !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }
    
    if (!acceptTerms) {
      newErrors.terms = 'Você deve aceitar os termos de uso';
    }

    
    const digits = formData.phone.replace(/\D/g, '');
    if (!digits) {
      newErrors.phone = 'Telefone é obrigatório';
    } else {
      
      if (digits.length < 10 || digits.length > 11) {
        newErrors.phone = 'Informe um telefone válido com DDD (10 ou 11 dígitos)';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      
      const phoneNormalized = formData.phone.replace(/\D/g, '');
      
      const result = await register(formData.name, formData.email, formData.password, phoneNormalized);
      
      if (result.success) {
        
        try {
          await chatApi.put('/api/users/me', { phone: formData.phone });
        } catch (err) {
          
        }
        navigate('/');
      } else {
        
        setErrors({ general: result.error || 'Erro ao criar conta' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const passwordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getStrengthColor = (strength: number) => {
    switch (strength) {
      case 0:
      case 1: return 'bg-red-500';
      case 2: return 'bg-yellow-500';
      case 3: return 'bg-blue-500';
      case 4: return 'bg-green-500';
      default: return 'bg-gray-600';
    }
  };

  const getStrengthText = (strength: number) => {
    switch (strength) {
      case 0:
      case 1: return 'Fraca';
      case 2: return 'Média';
      case 3: return 'Forte';
      case 4: return 'Muito forte';
      default: return '';
    }
  };

  
  const formatBrazilPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`;
  };


  const particleVariants = {
    animate: {
      y: [0, -20, 0],
      opacity: [0.3, 1, 0.3],
      transition: {
        duration: 3,
        repeat: Infinity
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {}
      <div className="absolute inset-0">
        <img 
          src={bannerImage} 
          alt="Background" 
          className="w-full h-full object-cover"
        />
        {}
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      </div>
      
      {}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            variants={particleVariants}
            animate="animate"
            transition={{
              delay: Math.random() * 2,
              duration: 2 + Math.random() * 2
            }}
          />
        ))}
      </div>

      {}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          className="w-full max-w-sm sm:max-w-md lg:max-w-lg"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {}
          <motion.div
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl"
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {}
            <motion.h1
              className="text-2xl sm:text-3xl font-bold text-white text-center mb-8"
              variants={itemVariants}
            >
              Criar conta
            </motion.h1>

            {}
            <form onSubmit={handleSubmit} className="space-y-5">
              {}
              <AnimatePresence>
                {errors.general && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="bg-red-500/20 border border-red-400/30 rounded-2xl p-4 backdrop-blur-sm"
                  >
                    <p className="text-red-200 text-sm text-center font-medium">{errors.general}</p>
                  </motion.div>
                )}
                {!errors.general && Object.keys(errors).some(key => key !== 'terms' && errors[key]) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="bg-red-500/20 border border-red-400/30 rounded-2xl p-4 backdrop-blur-sm"
                  >
                    <p className="text-red-200 text-sm text-center">Por favor, corrija os erros abaixo</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {}
              <motion.div variants={itemVariants} className="relative">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60 z-10" />
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border-2 transition-all duration-300 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:border-white/50 hover:border-white/30 ${
                      errors.name ? 'border-red-400/50' : 'border-white/20'
                    } autofill:bg-white/10 autofill:text-white`}
                    style={{
                      WebkitBoxShadow: '0 0 0 1000px transparent inset',
                      WebkitTextFillColor: 'white',
                      transition: 'background-color 5000s ease-in-out 0s'
                    }}
                  />
                </div>
                <AnimatePresence>
                  {errors.name && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-red-300 text-xs mt-2 ml-2"
                    >
                      {errors.name}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {}
              <motion.div variants={itemVariants} className="relative">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60 z-10" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border-2 transition-all duration-300 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:border-white/50 hover:border-white/30 ${
                      errors.email ? 'border-red-400/50' : 'border-white/20'
                    }`}
                    style={{
                      WebkitBoxShadow: '0 0 0 1000px transparent inset',
                      WebkitTextFillColor: 'white',
                      transition: 'background-color 5000s ease-in-out 0s'
                    }}
                  />
                </div>
                <AnimatePresence>
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-red-300 text-xs mt-2 ml-2"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {}
              <motion.div variants={itemVariants} className="relative">
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60 z-10" />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={16}
                    required
                    aria-label="Telefone com DDD"
                    placeholder="Telefone (WhatsApp) — ex: (11) 91234-5678"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', formatBrazilPhone(e.target.value))}
                    onPaste={(e) => {
                      try {
                        const text = (e.clipboardData || (window as any).clipboardData).getData('text') || '';
                        e.preventDefault();
                        handleInputChange('phone', formatBrazilPhone(text));
                      } catch {}
                    }}
                    className={`w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border-2 transition-all duration-300 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:border-white/50 hover:border-white/30 ${
                      errors.phone ? 'border-red-400/50' : 'border-white/20'
                    }`}
                    style={{
                      WebkitBoxShadow: '0 0 0 1000px transparent inset',
                      WebkitTextFillColor: 'white',
                      transition: 'background-color 5000s ease-in-out 0s'
                    }}
                  />
                </div>
                <AnimatePresence>
                  {errors.phone && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-red-300 text-xs mt-2 ml-2"
                    >
                      {errors.phone}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {}
              <motion.div variants={itemVariants} className="relative">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60 z-10" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Senha"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full pl-12 pr-12 py-4 bg-white/10 backdrop-blur-sm border-2 transition-all duration-300 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:border-white/50 hover:border-white/30 ${
                      errors.password ? 'border-red-400/50' : 'border-white/20'
                    }`}
                    style={{
                      WebkitBoxShadow: '0 0 0 1000px transparent inset',
                      WebkitTextFillColor: 'white',
                      transition: 'background-color 5000s ease-in-out 0s'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200 z-10"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {}
                <AnimatePresence>
                  {formData.password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 space-y-2"
                    >
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                              passwordStrength(formData.password) >= level
                                ? getStrengthColor(passwordStrength(formData.password))
                                : 'bg-white/20'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-white/60 ml-2">
                        Força: {getStrengthText(passwordStrength(formData.password))}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <AnimatePresence>
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-red-300 text-xs mt-2 ml-2"
                    >
                      {errors.password}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {}
              <motion.div variants={itemVariants} className="relative">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60 z-10" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirmar senha"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full pl-12 pr-12 py-4 bg-white/10 backdrop-blur-sm border-2 transition-all duration-300 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:border-white/50 hover:border-white/30 ${
                      errors.confirmPassword ? 'border-red-400/50' : 'border-white/20'
                    }`}
                    style={{
                      WebkitBoxShadow: '0 0 0 1000px transparent inset',
                      WebkitTextFillColor: 'white',
                      transition: 'background-color 5000s ease-in-out 0s'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200 z-10"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <AnimatePresence>
                  {errors.confirmPassword && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-red-300 text-xs mt-2 ml-2"
                    >
                      {errors.confirmPassword}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {}
              <motion.div variants={itemVariants} className="space-y-2">
                <label className="flex items-start space-x-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => {
                        setAcceptTerms(e.target.checked);
                        if (errors.terms) {
                          setErrors(prev => ({ ...prev, terms: '' }));
                        }
                      }}
                      className="sr-only"
                    />
                    <motion.div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                        acceptTerms
                          ? 'bg-white border-white'
                          : 'border-white/40 bg-white/10 group-hover:border-white/60'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <AnimatePresence>
                        {acceptTerms && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Check className="w-3 h-3 text-purple-800" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                  <span className="text-sm text-white/80 group-hover:text-white transition-colors duration-200 leading-5">
                    Eu aceito os{' '}
                    <Link 
                      to="/terms" 
                      className="text-white font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Termos de Serviço
                    </Link>{' '}
                    e{' '}
                    <Link 
                      to="/privacy" 
                      className="text-white font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Política de Privacidade
                    </Link>
                  </span>
                </label>
                <AnimatePresence>
                  {errors.terms && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-red-300 text-xs ml-8"
                    >
                      {errors.terms}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {}
              <motion.button
                type="submit"
                variants={itemVariants}
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                disabled={isSubmitting}
                className="w-full py-4 bg-white text-purple-800 font-semibold rounded-2xl transition-all duration-300 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-800 mr-2"></div>
                    Criando conta...
                  </div>
                ) : (
                  'Criar conta'
                )}
              </motion.button>
            </form>

            {}
            <motion.div 
              variants={itemVariants}
              className="text-center mt-6"
            >
              <p className="text-white/80 text-sm">
                Já tem uma conta?{' '}
                <Link
                  to="/login"
                  className="text-white font-medium hover:underline transition-all duration-200"
                >
                  Entrar
                </Link>
              </p>
            </motion.div>
          </motion.div>

          {}
          <motion.div
            variants={itemVariants}
            className="text-center mt-6"
          >
            <Link
              to="/"
              className="inline-flex items-center text-white/60 hover:text-white transition-colors duration-200 text-sm"
            >
              ← Voltar ao início
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {}
      <div className="absolute bottom-0 left-0 right-0 h-32 sm:h-40 pointer-events-none">
        <div className="absolute bottom-0 left-4 sm:left-8 w-8 sm:w-12 h-20 sm:h-24 bg-black/40 rounded-t-full transform -skew-y-12"></div>
        <div className="absolute bottom-0 left-12 sm:left-20 w-6 sm:w-8 h-16 sm:h-20 bg-black/30 rounded-t-full transform skew-y-6"></div>
        <div className="absolute bottom-0 right-4 sm:right-8 w-10 sm:w-14 h-24 sm:h-28 bg-black/40 rounded-t-full transform skew-y-12"></div>
        <div className="absolute bottom-0 right-16 sm:right-24 w-6 sm:w-8 h-18 sm:h-22 bg-black/30 rounded-t-full transform -skew-y-6"></div>
      </div>
    </div>
  );
};

export default RegisterPage;