import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock,
  CheckCircle,
  XCircle,
  Package,
  FilterX,
  Filter,
  AlertTriangle
} from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface StatusFilterProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'all' | 'marketplace' | 'boosting';
}

export const StatusFilter: React.FC<StatusFilterProps> = ({ value, onChange, type = 'all' }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const options = useMemo(() => {
    // Opções comuns para todos os tipos
    const commonOptions: FilterOption[] = [
      {
        value: 'all',
        label: 'Todos',
        icon: <FilterX size={16} />,
        color: 'bg-gray-600 text-gray-100'
      },
      {
        value: 'completed',
        label: 'Concluído',
        icon: <CheckCircle size={16} />,
        color: 'bg-green-600/20 text-green-400'
      },
      {
        value: 'cancelled',
        label: 'Cancelado',
        icon: <XCircle size={16} />,
        color: 'bg-red-600/20 text-red-400'
      }
    ];
    
    // Opções específicas para boosting
    if (type === 'boosting') {
      return [
        ...commonOptions,
        {
          value: 'pending',
          label: 'Pendente',
          icon: <Clock size={16} />,
          color: 'bg-blue-600/20 text-blue-400'
        },
        {
          value: 'active',
          label: 'Em Andamento',
          icon: <Clock size={16} />,
          color: 'bg-indigo-600/20 text-indigo-400'
        },
        {
          value: 'in_progress',
          label: 'Em Progresso',
          icon: <Clock size={16} />,
          color: 'bg-purple-600/20 text-purple-400'
        },
        {
          value: 'disputed',
          label: 'Em Disputa',
          icon: <AlertTriangle size={16} />,
          color: 'bg-red-600/20 text-red-400'
        }
      ];
    }
    
    // Opções para marketplace ou default
    return [
      ...commonOptions,
      {
        value: 'initiated',
        label: 'Iniciado',
        icon: <Clock size={16} />,
        color: 'bg-blue-600/20 text-blue-400'
      },
      {
        value: 'escrow_reserved',
        label: 'Em Escrow',
        icon: <Clock size={16} />,
        color: 'bg-amber-600/20 text-amber-400'
      },
      {
        value: 'shipped',
        label: 'Enviado',
        icon: <Package size={16} />,
        color: 'bg-indigo-600/20 text-indigo-400'
      },
      {
        value: 'delivered',
        label: 'Entregue',
        icon: <CheckCircle size={16} />,
        color: 'bg-emerald-600/20 text-emerald-400'
      }
    ];
  }, [type]);

  const currentOption = options.find(option => option.value === value) || options[0];
  
  const toggleDropdown = () => setIsOpen(!isOpen);
  
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <button 
        onClick={toggleDropdown}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700/60 rounded-lg text-sm text-gray-200 hover:bg-gray-750 transition-colors"
      >
        <Filter size={16} className="text-gray-400" />
        <span>Status: </span>
        <span className={`flex items-center gap-1 ${currentOption.color} px-2 py-0.5 rounded-md`}>
          {currentOption.icon}
          {currentOption.label}
        </span>
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={toggleDropdown} />
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-1 z-20 min-w-[200px] bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 overflow-hidden"
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm text-left text-white hover:bg-gray-700/50 transition-colors ${value === option.value ? 'bg-gray-700/50' : ''}`}
              >
                <span className={option.value !== 'all' ? option.color.split(' ')[1] : 'text-gray-200'}>
                  {option.icon}
                </span>
                {option.label}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
};

export default StatusFilter;
