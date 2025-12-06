import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, X, AlertCircle } from 'lucide-react';
import { createReview, CreateReviewData } from '../services/reviewService';

interface ReviewFormProps {
  targetUserId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isOpen: boolean;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ 
  targetUserId, 
  onSuccess, 
  onCancel, 
  isOpen 
}) => {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Por favor, selecione uma avaliação de 1 a 5 estrelas');
      return;
    }

    if (comment.length > 1500) {
      setError('O comentário deve ter no máximo 1500 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const reviewData: CreateReviewData = {
        targetId: targetUserId,
        targetType: 'user',
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
      };

      await createReview(reviewData);
      

      setRating(0);
      setTitle('');
      setComment('');
      
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar avaliação');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setRating(0);
    setTitle('');
    setComment('');
    setError(null);
    onCancel?.();
  };

  const renderStarRating = () => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHoveredRating(i + 1)}
            onMouseLeave={() => setHoveredRating(0)}
            onClick={() => setRating(i + 1)}
            className="transition-colors duration-200"
          >
            <Star
              className={`w-8 h-8 ${
                i < (hoveredRating || rating)
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-600 hover:text-yellow-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md"
      >
        {}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Avaliar Usuário</h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {}
          <div>
            <label className="block text-white font-medium mb-3">
              Sua avaliação *
            </label>
            {renderStarRating()}
            {rating > 0 && (
              <p className="text-gray-400 text-sm mt-2">
                {rating} de 5 estrelas
              </p>
            )}
          </div>

          {}
          <div>
            <label className="block text-white font-medium mb-2">
              Título (opcional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resuma sua experiência..."
              maxLength={100}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {}
          <div>
            <label className="block text-white font-medium mb-2">
              Comentário
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte sobre sua experiência com este usuário..."
              maxLength={1500}
              rows={4}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
            <div className="flex justify-between items-center mt-2">
              <span className={`text-sm ${
                comment.length > 1400 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {comment.length}/1500 caracteres
              </span>
            </div>
          </div>

          {}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || rating === 0}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Avaliação
                </>
              )}
            </button>
          </div>
        </form>

        {}
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded-xl">
          <p className="text-blue-300 text-sm">
            💡 Você só pode avaliar usuários com quem já teve pedidos aceitos.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReviewForm;
