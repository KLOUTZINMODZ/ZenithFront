import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Review } from '../../services/homeService';

interface ReviewsSectionProps {
  reviews: Review[];
  limit?: number; 
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ reviews, limit }) => {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-3 h-3 ${
          index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'
        }`}
      />
    ));
  };

  
  if (!reviews || reviews.length === 0) {
    return null;
  }

  
  const displayedReviews = limit ? reviews.slice(0, limit) : reviews;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {displayedReviews.map((review, index) => (
        <motion.div
          key={review._id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-4 border border-gray-700/50 hover:border-purple-500/40 transition-all"
        >
          {}
          <div className="flex items-start gap-3 mb-3">
            {review.reviewer.avatar ? (
              <img
                src={review.reviewer.avatar}
                alt={review.reviewer.name}
                className="w-10 h-10 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {review.reviewer.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {review.reviewer.name}
              </p>
              <div className="flex items-center gap-0.5 mt-1">
                {renderStars(review.rating)}
              </div>
            </div>
          </div>

          {}
          <p className="text-gray-300 text-sm leading-relaxed overflow-hidden" style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical'
          }}>
            {review.comment}
          </p>

          {}
          {review.title && (
            <div className="mt-3 pt-3 border-t border-gray-700/30">
              <p className="text-purple-400 text-xs font-medium">
                {review.title}
              </p>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};
