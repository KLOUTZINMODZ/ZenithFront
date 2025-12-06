import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

// Lazy load dos componentes
const MarketplaceItemPageDesktop = React.lazy(() => import('./MarketplaceItemPage'));
const MarketplaceItemPageMobile = React.lazy(() => import('./MarketplaceItemPageMobile'));

const LoadingFallback = () => (
  <div className="flex justify-center items-center min-h-[70vh]">
    <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
  </div>
);

/**
 * Wrapper que renderiza o componente correto baseado no tamanho da tela
 * - Mobile (≤ 768px): MarketplaceItemPageMobile
 * - Desktop (> 768px): MarketplaceItemPageDesktop
 */
const MarketplaceItemPageWrapper: React.FC = () => {
  const isMobile = useIsMobile(768);

  return (
    <Suspense fallback={<LoadingFallback />}>
      {isMobile ? (
        <MarketplaceItemPageMobile />
      ) : (
        <MarketplaceItemPageDesktop />
      )}
    </Suspense>
  );
};

export default MarketplaceItemPageWrapper;
