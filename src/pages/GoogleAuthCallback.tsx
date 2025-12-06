import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Página de callback do Google OAuth
 * Captura o código de autorização e envia para a janela pai
 */
const GoogleAuthCallback: React.FC = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    if (window.opener) {
      if (error) {
        // Enviar erro para janela pai
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: error === 'access_denied' ? 'Acesso negado' : 'Erro na autenticação'
        }, window.location.origin);
      } else if (code && state) {
        // Enviar código de sucesso para janela pai
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          code,
          state
        }, window.location.origin);
      } else {
        // Parâmetros inválidos
        window.opener.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: 'Parâmetros de autenticação inválidos'
        }, window.location.origin);
      }
      
      // Fechar a janela após enviar a mensagem
      window.close();
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
        <p className="text-white text-lg font-semibold">Autenticando com Google...</p>
        <p className="text-gray-400 text-sm mt-2">Aguarde enquanto processamos seu login</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
