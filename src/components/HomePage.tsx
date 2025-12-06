import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { homeService, HomeData } from '../services/homeService';
import { MarketplaceCarousel } from './home/MarketplaceCarousel';
import { BoostingCarousel } from './home/BoostingCarousel';
import { ReviewsSection } from './home/ReviewsSection';
import { Footer } from './home/Footer';
import { HeroBannerCarousel } from './home/HeroBannerCarousel';
import { useDevice } from '../hooks/useDevice';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet, touchDevice } = useDevice();
  
  
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  

  
  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);
        const data = await homeService.getHomeData();
        setHomeData(data);
      } catch (err: any) {
        console.error('Error loading home data:', err);
        
      } finally {
        setLoading(false);
      }
    };
    
    fetchHomeData();
  }, []);
  
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'space-y-6' : isTablet ? 'space-y-8' : 'space-y-12'} pb-0`}>
      {}
      <HeroBannerCarousel banners={homeData?.heroBanners || []} />

      {}
      <section className={`container mx-auto ${
        isMobile ? 'px-3' : isTablet ? 'px-5' : 'px-4 sm:px-6 lg:px-8'
      }`}>
        <div className={`flex items-center ${
          isMobile ? 'gap-2 mb-3' : 'items-end justify-between mb-5'
        }`}>
          <div className="flex-1 min-w-0">
            <h2 className={`${
              isMobile ? 'text-lg' : isTablet ? 'text-xl' : 'text-2xl lg:text-3xl'
            } font-bold text-white ${
              isMobile ? 'truncate' : ''
            }`}>
              Ofertas do Marketplace
            </h2>
          </div>
          <button
            onClick={() => navigate('/marketplace')}
            className={`${
              isMobile 
                ? 'px-3 py-1.5 text-xs' 
                : isTablet 
                  ? 'px-4 py-2 text-sm' 
                  : 'px-5 py-2 text-sm'
            } bg-purple-600 ${
              touchDevice ? 'active:bg-purple-800' : 'hover:bg-purple-700'
            } text-white rounded-lg font-semibold transition-colors flex-shrink-0`}
          >
            {isMobile ? 'Ver +' : 'Ver mais'}
          </button>
        </div>
        <MarketplaceCarousel items={homeData?.marketplace || []} />
      </section>

      {}
      <section className={`container mx-auto ${
        isMobile ? 'px-3' : isTablet ? 'px-5' : 'px-4 sm:px-6 lg:px-8'
      }`}>
        <div className={`flex items-center ${
          isMobile ? 'gap-2 mb-3' : 'items-end justify-between mb-5'
        }`}>
          <div className="flex-1 min-w-0">
            <h2 className={`${
              isMobile ? 'text-lg' : isTablet ? 'text-xl' : 'text-2xl lg:text-3xl'
            } font-bold text-white ${
              isMobile ? 'truncate' : ''
            }`}>
              Pedidos de Boosting Ativos
            </h2>
          </div>
          <button
            onClick={() => navigate('/browse-boostings')}
            className={`${
              isMobile 
                ? 'px-3 py-1.5 text-xs' 
                : isTablet 
                  ? 'px-4 py-2 text-sm' 
                  : 'px-5 py-2 text-sm'
            } bg-purple-600 ${
              touchDevice ? 'active:bg-purple-800' : 'hover:bg-purple-700'
            } text-white rounded-lg font-semibold transition-colors flex-shrink-0`}
          >
            {isMobile ? 'Ver +' : 'Ver todos'}
          </button>
        </div>
        <BoostingCarousel requests={homeData?.boosting || []} />
      </section>

      {}
      <section className={`container mx-auto ${
        isMobile ? 'px-3' : isTablet ? 'px-5' : 'px-4 sm:px-6 lg:px-8'
      }`}>
        <div className={`flex items-center ${
          isMobile ? 'gap-2 mb-3' : 'items-end justify-between mb-5'
        }`}>
          <div className="flex-1 min-w-0">
            <h2 className={`${
              isMobile ? 'text-lg' : isTablet ? 'text-xl' : 'text-2xl lg:text-3xl'
            } font-bold text-white ${
              isMobile ? 'line-clamp-2' : ''
            }`}>
              {isMobile ? 'Avaliações Recentes' : 'Avaliações Dos Usuarios'}
            </h2>
          </div>
          <button
            onClick={() => navigate('/reviews')}
            className={`${
              isMobile 
                ? 'px-3 py-1.5 text-xs' 
                : isTablet 
                  ? 'px-4 py-2 text-sm' 
                  : 'px-5 py-2 text-sm'
            } bg-purple-600 ${
              touchDevice ? 'active:bg-purple-800' : 'hover:bg-purple-700'
            } text-white rounded-lg font-semibold transition-colors flex-shrink-0`}
          >
            {isMobile ? 'Ver +' : 'Ver todos'}
          </button>
        </div>
        <ReviewsSection reviews={homeData?.reviews || []} limit={6} />
      </section>

      {}
      <Footer />
    </div>
  );
};

export default HomePage;