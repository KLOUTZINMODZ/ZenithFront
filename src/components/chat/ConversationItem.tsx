import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { User, Clock, XCircle } from 'lucide-react';

interface ConversationItemProps {
  conversation: any;
  isActive: boolean;
  displayName: string;
  lastMessageText: string;
  avatarUrl: string | null;
  unreadCount: number;
  isTemporary: boolean;
  temporaryStatus: string | null;
  expiresAt: string | null;
  onClick: () => void;
  getTimeRemaining: (expiresAt: string) => string;
  toAbsoluteImageUrl: (url: string) => string;
}

const ConversationItem: React.FC<ConversationItemProps> = memo(({
  conversation,
  isActive,
  displayName,
  lastMessageText,
  avatarUrl,
  unreadCount,
  isTemporary,
  temporaryStatus,
  expiresAt,
  onClick,
  getTimeRemaining,
  toAbsoluteImageUrl
}) => {
  return (
    <div
      className={`relative p-3 sm:p-4 border-b border-gray-700/30 cursor-pointer transition-all duration-200 ${
        isActive 
          ? 'bg-gradient-to-r from-purple-600/20 via-purple-500/10 to-transparent border-l-4 border-l-purple-500 shadow-lg shadow-purple-500/10' 
          : 'hover:bg-gray-800/40 hover:border-l-4 hover:border-l-gray-600'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <div className="relative flex-shrink-0">
          {avatarUrl ? (
            <img
              src={toAbsoluteImageUrl(avatarUrl)}
              alt={displayName}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-purple-500/50 shadow-lg ring-2 ring-purple-500/20"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-purple-400/30 ${
            avatarUrl ? 'hidden' : ''
          }`}>
            <User className="w-5 h-5 text-white" />
          </div>
          
          {}
          {isTemporary && temporaryStatus === 'pending' && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 rounded-full flex items-center justify-center border-2 border-gray-900 shadow-lg">
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
            </div>
          )}
          
          {temporaryStatus === 'expired' && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-gray-900 shadow-lg">
              <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-sm sm:text-base truncate">
              {displayName}
            </h3>
            
            {}
            {isTemporary && temporaryStatus === 'pending' && expiresAt && (
              <span className="text-xs text-gray-500 flex-shrink-0">
                {getTimeRemaining(expiresAt)}
              </span>
            )}
          </div>
          
          <p className="text-xs sm:text-sm text-gray-400 truncate">
            {lastMessageText}
          </p>
        </div>
        
        {unreadCount > 0 && !isActive && (
          <motion.div 
            className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  
  return (
    prevProps.conversation._id === nextProps.conversation._id &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.displayName === nextProps.displayName &&
    prevProps.lastMessageText === nextProps.lastMessageText &&
    prevProps.avatarUrl === nextProps.avatarUrl &&
    prevProps.unreadCount === nextProps.unreadCount &&
    prevProps.isTemporary === nextProps.isTemporary &&
    prevProps.temporaryStatus === nextProps.temporaryStatus &&
    prevProps.expiresAt === nextProps.expiresAt
  );
});

ConversationItem.displayName = 'ConversationItem';

export default ConversationItem;
