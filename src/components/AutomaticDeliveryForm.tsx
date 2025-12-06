/**
 * Component: Automatic Delivery Form
 * Formulário para coleta segura de credenciais de conta
 * Exibido quando o vendedor seleciona "Entrega Automática"
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';

interface AutomaticDeliveryFormProps {
  onSubmit: (credentials: {
    loginPlatform: string;
    accountName: string;
    email: string;
    password: string;
    vendorNotes?: string;
  }) => void;
  isLoading?: boolean;
  error?: string;
}

const VALID_PLATFORMS = [
  'Steam',
  'Epic Games',
  'Gmail',
  'Riot',
  'Ubisoft',
  'PlayStation',
  'Xbox',
  'Nintendo',
  'Other'
];

const AutomaticDeliveryForm: React.FC<AutomaticDeliveryFormProps> = ({
  onSubmit,
  isLoading = false,
  error
}) => {
  const [formData, setFormData] = useState({
    loginPlatform: '',
    accountName: '',
    email: '',
    password: '',
    vendorNotes: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.loginPlatform.trim()) {
      errors.loginPlatform = 'Selecione uma plataforma de login';
    }

    if (!formData.accountName.trim()) {
      errors.accountName = 'Nome ou ID da conta é obrigatório';
    }

    if (!formData.email.trim()) {
      errors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'E-mail inválido';
    }

    if (!formData.password.trim()) {
      errors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 4) {
      errors.password = 'Senha deve ter pelo menos 4 caracteres';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    // Limpar erro do campo
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-purple-500/20 rounded-2xl p-6 lg:p-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <Lock className="w-6 h-6 text-purple-400" />
        <h3 className="text-xl font-bold text-white">Credenciais da Conta</h3>
      </div>

      <p className="text-sm text-gray-400 mb-6">
        ⚠️ Suas credenciais serão criptografadas com AES-256-GCM e armazenadas de forma segura.
        Apenas o comprador autenticado poderá acessá-las após a compra.
      </p>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-900/20 border border-red-700/30 rounded-lg"
        >
          <p className="text-red-400 text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Plataforma de Login */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Plataforma de Login *
          </label>
          <select
            name="loginPlatform"
            value={formData.loginPlatform}
            onChange={handleInputChange}
            className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${
              formErrors.loginPlatform
                ? 'border-red-500 ring-2 ring-red-500/20'
                : 'border-gray-600'
            }`}
          >
            <option value="">Selecione uma plataforma</option>
            {VALID_PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
          {formErrors.loginPlatform && (
            <p className="text-red-400 text-sm mt-2">{formErrors.loginPlatform}</p>
          )}
        </motion.div>

        {/* Nome/ID da Conta */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nome ou ID da Conta *
          </label>
          <input
            type="text"
            name="accountName"
            value={formData.accountName}
            onChange={handleInputChange}
            placeholder="Ex.: usuario123, email@example.com"
            className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${
              formErrors.accountName
                ? 'border-red-500 ring-2 ring-red-500/20'
                : 'border-gray-600'
            }`}
          />
          {formErrors.accountName && (
            <p className="text-red-400 text-sm mt-2">{formErrors.accountName}</p>
          )}
        </motion.div>

        {/* E-mail */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            E-mail de Login *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="email@example.com"
            className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 ${
              formErrors.email
                ? 'border-red-500 ring-2 ring-red-500/20'
                : 'border-gray-600'
            }`}
          />
          {formErrors.email && (
            <p className="text-red-400 text-sm mt-2">{formErrors.email}</p>
          )}
        </motion.div>

        {/* Senha */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Senha *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              className={`w-full px-4 py-3.5 bg-gray-700/50 border rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 pr-12 ${
                formErrors.password
                  ? 'border-red-500 ring-2 ring-red-500/20'
                  : 'border-gray-600'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {formErrors.password && (
            <p className="text-red-400 text-sm mt-2">{formErrors.password}</p>
          )}
        </motion.div>

        {/* Notas do Vendedor */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notas Adicionais (opcional)
          </label>
          <textarea
            name="vendorNotes"
            value={formData.vendorNotes}
            onChange={handleInputChange}
            placeholder="Ex.: Conta com skins raras, nível 50, etc."
            rows={3}
            className="w-full px-4 py-3.5 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 transition-all duration-200 hover:bg-gray-700/70 hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
          />
        </motion.div>

        {/* Aviso de Segurança */}
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            🔒 <strong>Segurança:</strong> Suas credenciais serão criptografadas imediatamente
            e armazenadas em uma collection separada, isolada dos dados públicos do produto.
          </p>
        </div>

        {/* Botão de Envio */}
        <motion.button
          type="submit"
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:from-gray-600 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Criptografando...
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              Criptografar e Salvar Credenciais
            </>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default AutomaticDeliveryForm;
