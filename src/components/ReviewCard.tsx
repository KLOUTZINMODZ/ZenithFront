import React, { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Star, ThumbsUp, ThumbsDown, CheckCircle, User } from 'lucide-react';
import { Review, checkUserVoteStatus } from '../services/reviewService';

interface ReviewCardProps {
  review: Review;
  onMarkHelpful?: (reviewId: string, isHelpful: boolean) => void;
  showActions?: boolean;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ 
  review, 
  onMarkHelpful,
  showActions = true 
}) => {
  const [voteStatus, setVoteStatus] = useState<{hasVoted: boolean, userVote: string | null}>({
    hasVoted: false,
    userVote: null
  });
  const [helpfulCount, setHelpfulCount] = useState(review.isHelpful);
  const [notHelpfulCount, setNotHelpfulCount] = useState(review.isNotHelpful);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkVoteStatus = async () => {
      try {
        const status = await checkUserVoteStatus(review._id);
        setVoteStatus(status);
      } catch (error) {
              }
    };

    if (showActions) {
      checkVoteStatus();
    }
  }, [review._id, showActions]);

  const handleVote = async (isHelpful: boolean) => {
    if (voteStatus.hasVoted || isLoading) return;

    setIsLoading(true);
    try {
      if (onMarkHelpful) {
        await onMarkHelpful(review._id, isHelpful);
        

        setVoteStatus({
          hasVoted: true,
          userVote: isHelpful ? 'helpful' : 'not_helpful'
        });

        if (isHelpful) {
          setHelpfulCount(prev => prev + 1);
        } else {
          setNotHelpfulCount(prev => prev + 1);
        }
      }
    } catch (error) {
          } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getOrderStatusColor = (status: string) => {
    
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-700/40';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-400 border border-blue-700/40';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400 border border-yellow-700/40';
      case 'open':
        return 'bg-purple-500/10 text-purple-400 border border-purple-700/40';
      case 'cancelled':
        return 'bg-red-500/10 text-red-400 border border-red-700/40';
      default:
        return 'bg-gray-500/10 text-gray-400 border border-gray-700/40';
    }
  };

  const getOrderStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Pedido Concluído';
      case 'in_progress':
        return 'Em Progresso';
      case 'pending':
        return 'Pendente';
      case 'open':
        return 'Aberto';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
        }`}
      />
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gray-800 rounded-xl border border-gray-700 p-5 sm:p-6 overflow-hidden"
    >
      {}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
            {review.userId.profileImage ? (
              <img
                src={review.userId.profileImage}
                alt={review.userId.name}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <User className="w-5 h-5 text-gray-400" />
            )}
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-white font-medium truncate max-w-[40vw] md:max-w-[24rem]">{review.userId.name}</h4>
              {review.isVerifiedPurchase && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-1 bg-green-500/10 text-green-400 border border-green-700/40">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Compra Verificada
                </span>
              )}
              {review.orderStatus && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-1 border ${getOrderStatusColor(review.orderStatus)}`}>{getOrderStatusText(review.orderStatus)}</span>
              )}
            </div>
            <p className="text-gray-400 text-sm">{formatDate(review.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {renderStars(review.rating)}
        </div>
      </div>

      {}
      {review.title && (
        <h5 className="text-white font-medium mb-2">{review.title}</h5>
      )}

      {}
      {review.comment && (
        <p className="text-gray-300 leading-relaxed mb-4 break-words">{review.comment}</p>
      )}

      {}
      {showActions && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => handleVote(true)}
              disabled={voteStatus.hasVoted || isLoading}
              className={`flex items-center gap-2 transition-colors ${
                voteStatus.hasVoted && voteStatus.userVote === 'helpful'
                  ? 'text-green-400'
                  : voteStatus.hasVoted
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-green-400'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span className="text-sm">{helpfulCount}</span>
            </button>
            
            <button
              onClick={() => handleVote(false)}
              disabled={voteStatus.hasVoted || isLoading}
              className={`flex items-center gap-2 transition-colors ${
                voteStatus.hasVoted && voteStatus.userVote === 'not_helpful'
                  ? 'text-red-400'
                  : voteStatus.hasVoted
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-red-400'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span className="text-sm">{notHelpfulCount}</span>
            </button>
          </div>

          <div className="text-gray-500 text-xs">
            {voteStatus.hasVoted ? 'Você já votou' : 'Esta avaliação foi útil?'}
          </div>
        </div>
      )}
    </motion.div>
  );
};


export default memo(ReviewCard, (prevProps, nextProps) => {
  return (
    prevProps.review._id === nextProps.review._id &&
    prevProps.review.isHelpful === nextProps.review.isHelpful &&
    prevProps.review.isNotHelpful === nextProps.review.isNotHelpful &&
    prevProps.showActions === nextProps.showActions
  );
});
