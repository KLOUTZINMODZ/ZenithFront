import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Clock, MessageSquare, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { boostingService } from '../services';
import { PRICE_LIMITS } from '../constants/priceLimits';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  boostingRequest: {
    _id: string;
    currentRank?: string;
    desiredRank?: string;
    boostingCategory?: string;
    minPrice: number;
    game: string;
    client: {
      name: string;
      avatar: string;
    };
  };
  onProposalCreated?: () => void;
}

const ProposalModal: React.FC<ProposalModalProps> = ({
  isOpen,
  onClose,
  boostingRequest,
  onProposalCreated
}) => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    proposedPrice: '',
    estimatedTime: '',
    message: ''
  });
  const [displayPrice, setDisplayPrice] = useState('');
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  const timeOptions = [
    '30 minutos',
    '1 hora',
    '2 horas',
    '3 horas',
    '6 horas',
    '12 horas',
    '1 dia',
    '3 dias',
    '7 dias',
    '14 dias',
    '30 dias'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      addNotification({
        title: 'Erro',
        message: 'Você precisa estar logado para fazer uma proposta',
        type: 'error'
      });
      return;
    }

    if (!formData.proposedPrice || !formData.estimatedTime) {
      addNotification({
        title: 'Erro',
        message: 'Preço e tempo estimado são obrigatórios',
        type: 'error'
      });
      return;
    }

    const price = parseFloat(formData.proposedPrice);
    if (isNaN(price) || price <= 0) {
      addNotification({
        title: 'Erro',
        message: 'Preço deve ser um valor válido',
        type: 'error'
      });
      return;
    }

    setLoading(true);

    try {
      const response = await boostingService.createProposal(boostingRequest._id, {
        proposedPrice: price,
        estimatedTime: formData.estimatedTime,
        message: formData.message
      });

      if (response.success) {
    
        
        setFormData({
          proposedPrice: '',
          estimatedTime: '',
          message: ''
        });
        setDisplayPrice('');
        
        onClose();
        onProposalCreated?.();
      } else {
        addNotification({
          title: 'Erro',
          message: response.message || 'Erro ao enviar proposta',
          type: 'error'
        });
      }
    } catch (error) {
      addNotification({
        title: 'Erro',
        message: 'Erro interno do servidor',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'proposedPrice') {

      const numericValue = value.replace(/\D/g, '');
      
      if (numericValue === '') {
        setFormData(prev => ({ ...prev, proposedPrice: '' }));
        setDisplayPrice('');
        return;
      }
      

      const cents = parseInt(numericValue);
      const reais = cents / 100;
      

      if (reais > 99999.99) {
        return;
      }
      

      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
      }).format(reais);
      
      setDisplayPrice(formatted);
      setFormData(prev => ({
        ...prev,
        proposedPrice: reais.toString()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {

    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter'];
    const isNumber = /^[0-9]$/.test(e.key);
    
    if (!allowedKeys.includes(e.key) && !isNumber) {
      e.preventDefault();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Fazer Proposta</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {}
            <div className="bg-gray-900/50 rounded-lg p-4 mb-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                  {boostingRequest.client.avatar ? (
                    <img
                      src={boostingRequest.client.avatar}
                      alt={boostingRequest.client.name}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = boostingRequest.client.name.charAt(0).toUpperCase();
                      }}
                    />
                  ) : (
                    boostingRequest.client.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{boostingRequest.client.name}</h3>
                  <p className="text-sm text-gray-400">{boostingRequest.game}</p>
                </div>
              </div>
              {}
              {boostingRequest.currentRank && boostingRequest.desiredRank ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">De:</span>
                    <p className="text-white font-medium">{boostingRequest.currentRank}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Para:</span>
                    <p className="text-white font-medium">{boostingRequest.desiredRank}</p>
                  </div>
                </div>
              ) : boostingRequest.boostingCategory ? (
                <div className="text-sm">
                  <span className="text-gray-400">Categoria:</span>
                  <p className="text-white font-medium">{boostingRequest.boostingCategory}</p>
                </div>
              ) : null}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <span className="text-gray-400 text-sm">Preço mínimo:</span>
                <p className="text-green-400 font-bold">{formatPrice(boostingRequest.minPrice)}</p>
              </div>
            </div>

            {}
            <form onSubmit={handleSubmit} className="space-y-4">
              {}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Preço Proposto *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="proposedPrice"
                    value={displayPrice}
                    onChange={handleInputChange}
                    onKeyDown={handlePriceKeyDown}
                    placeholder="Digite apenas números (ex: 15000 = R$ 150,00)"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                  {displayPrice && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <span className="text-green-400 text-sm font-medium">
                        ✓
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Min: R$ {PRICE_LIMITS.MIN.toFixed(2).replace('.', ',')} - Máx: R$ {PRICE_LIMITS.MAX.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              {}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Tempo Estimado *
                </label>
                {}
                <input
                  type="text"
                  name="estimatedTime"
                  value={formData.estimatedTime}
                  onChange={() => {}}
                  required
                  className="hidden"
                />

                <div
                  className="relative"
                  tabIndex={0}
                  onBlur={(e) => {

                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setIsTimeOpen(false);
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsTimeOpen((v) => !v)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-left text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent flex items-center justify-between"
                  >
                    <span className={formData.estimatedTime ? 'text-white' : 'text-gray-400'}>
                      {formData.estimatedTime || 'Selecione o tempo estimado'}
                    </span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isTimeOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isTimeOpen && (
                    <div className="absolute z-10 mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                      {}
                      <div className="max-h-36 overflow-y-auto custom-scrollbar">
                        {timeOptions.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, estimatedTime: opt }));
                              setIsTimeOpen(false);
                            }}
                            className={`w-full text-left h-12 px-4 text-sm flex items-center hover:bg-gray-700 transition-colors ${
                              formData.estimatedTime === opt ? 'bg-gray-700 text-white' : 'text-gray-200'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Mensagem (Opcional)
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Descreva sua experiência, método de trabalho, etc."
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar Proposta
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProposalModal;
