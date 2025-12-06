import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { completeGoogleRegistration } from '../services/googleAuthService';
import { validateBrazilianPhone, formatBrazilianPhone, normalizePhone } from '../utils/phoneValidation';

const CompleteGoogleRegistration: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleToken, setGoogleToken] = useState('');
  const [userEmail, setUserEmail] = useState('');
  
  useEffect(() => {
    // Obter googleToken e email do state da navegação
    const state = location.state as any;
    if (!state || !state.googleToken) {
      // Se não houver token, redirecionar para login
      navigate('/login', { replace: true });
      return;
    }
    
    setGoogleToken(state.googleToken);
    setUserEmail(state.email || '');
  }, [location, navigate]);
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBrazilianPhone(e.target.value);
    setPhone(formatted);
    setError('');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validar telefone
    const normalizedPhone = normalizePhone(phone);
    const phoneValidation = validateBrazilianPhone(normalizedPhone);
    
    if (!phoneValidation.valid) {
      setError(phoneValidation.message || 'Telefone inválido');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await completeGoogleRegistration(googleToken, normalizedPhone);
      
      if (response.success && response.token && response.user) {
        // Salvar token no localStorage
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Recarregar a página para atualizar o contexto
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        setError(response.error || 'Erro ao completar registro');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao completar registro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Phone className="w-8 h-8 text-white" />
            </motion.div>
            
            <h1 className="text-2xl font-bold text-white mb-2">
              Complete seu Cadastro
            </h1>
            <p className="text-gray-400 text-sm">
              {userEmail && (
                <span className="block mb-2">
                  Conta Google: <span className="text-purple-400">{userEmail}</span>
                </span>
              )}
              Para finalizar, precisamos do seu número de telefone
            </p>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">
                Número de Telefone *
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Digite seu telefone com DDD (celular ou fixo)
              </p>
            </div>
            
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}
            
            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading || !phone}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-600 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Finalizando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Finalizar Cadastro</span>
                </>
              )}
            </motion.button>
            
            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              disabled={loading}
              className="w-full bg-gray-800/60 hover:bg-gray-700 text-gray-300 hover:text-white font-medium py-3 rounded-xl transition-all border border-gray-700 hover:border-gray-600 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Login</span>
            </button>
          </form>
          
          {/* Info */}
          <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <p className="text-xs text-gray-300 text-center">
              🔒 Seu telefone é necessário para segurança da conta e comunicações importantes
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CompleteGoogleRegistration;
