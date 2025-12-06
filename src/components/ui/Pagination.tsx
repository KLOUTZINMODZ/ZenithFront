import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange
}) => {
  if (totalPages <= 1) return null;
  
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };
  
  // Gera um array de números de página para renderização
  const getPageNumbers = () => {
    // Para 5 ou menos páginas, mostra todas
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Para mais de 5 páginas, mostra sempre a primeira, a última e algumas no meio
    const pages = [];
    
    // Sempre mostra página 1
    pages.push(1);
    
    // Calcula páginas do meio
    if (currentPage <= 3) {
      // Se estiver no início, mostra 2, 3, 4, ...
      pages.push(2, 3, 4, '...');
    } else if (currentPage >= totalPages - 2) {
      // Se estiver no fim, mostra ..., n-3, n-2, n-1
      pages.push('...', totalPages - 3, totalPages - 2, totalPages - 1);
    } else {
      // No meio, mostra ..., currentPage-1, currentPage, currentPage+1, ...
      pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...');
    }
    
    // Sempre mostra a última página
    pages.push(totalPages);
    
    return pages;
  };
  
  const pageNumbers = getPageNumbers();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="flex justify-center items-center space-x-2 mt-8"
    >
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
      >
        <ChevronLeft size={18} />
      </button>
      
      {pageNumbers.map((page, index) => (
        page === '...' ? (
          <span key={`ellipsis-${index}`} className="flex items-center justify-center w-10 h-10 text-gray-400">
            ...
          </span>
        ) : (
          <motion.button
            key={`page-${page}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => goToPage(page as number)}
            disabled={page === currentPage}
            className={`flex items-center justify-center w-10 h-10 rounded-lg border ${
              page === currentPage
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
            } transition-all`}
          >
            {page}
          </motion.button>
        )
      ))}
      
      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
      >
        <ChevronRight size={18} />
      </button>
    </motion.div>
  );
};

export default Pagination;
