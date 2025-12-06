import axios from 'axios';

const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;
const API_URL = (import.meta as any).env.VITE_CHAT_API_URL;

export interface GoogleAuthResponse {
  success: boolean;
  token?: string;
  user?: any;
  needsAdditionalInfo?: boolean;
  googleToken?: string;
  email?: string;
  error?: string;
}

/**
 * Inicia o fluxo de autenticação com Google OAuth 2.0
 * Abre popup para login do Google
 */
export const initiateGoogleLogin = (): Promise<GoogleAuthResponse> => {
  return new Promise((resolve, reject) => {
    // Configurar o endpoint do Google OAuth
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'email profile';
    const responseType = 'code';
    const state = generateSecureState();
    
    // Salvar state no sessionStorage para validação posterior
    sessionStorage.setItem('google_oauth_state', state);
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=${responseType}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${state}&` +
      `access_type=offline&` +
      `prompt=consent`;
    
    // Abrir popup para autenticação
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      googleAuthUrl,
      'Google Login',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    
    if (!popup) {
      reject(new Error('Popup bloqueado. Por favor, permita popups para este site.'));
      return;
    }
    
    let isResolved = false;
    
    // Listener para mensagem do callback
    const messageHandler = async (event: MessageEvent) => {
      // Validar origem
      if (event.origin !== window.location.origin) {
        return;
      }
      
      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        isResolved = true;
        window.removeEventListener('message', messageHandler);
        clearInterval(popupCheckInterval);
        popup.close();
        
        try {
          // Enviar código para o backend para troca por tokens
          const response = await exchangeCodeForTokens(event.data.code, state);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        isResolved = true;
        window.removeEventListener('message', messageHandler);
        clearInterval(popupCheckInterval);
        popup.close();
        reject(new Error(event.data.error || 'Erro na autenticação com Google'));
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Verificar a cada 500ms se o popup foi fechado pelo usuário
    const popupCheckInterval = setInterval(() => {
      if (popup.closed && !isResolved) {
        clearInterval(popupCheckInterval);
        window.removeEventListener('message', messageHandler);
        reject(new Error('Autenticação cancelada'));
      }
    }, 500);
    
    // Timeout de 5 minutos
    setTimeout(() => {
      if (!popup.closed) {
        popup.close();
      }
      clearInterval(popupCheckInterval);
      window.removeEventListener('message', messageHandler);
      if (!isResolved) {
        reject(new Error('Tempo limite excedido'));
      }
    }, 300000);
  });
};

/**
 * Troca o código de autorização por tokens no backend
 */
const exchangeCodeForTokens = async (code: string, state: string): Promise<GoogleAuthResponse> => {
  try {
    const savedState = sessionStorage.getItem('google_oauth_state');
    
    // Validar state para prevenir CSRF
    if (state !== savedState) {
      throw new Error('Estado de segurança inválido. Possível ataque CSRF detectado.');
    }
    
    sessionStorage.removeItem('google_oauth_state');
    
    const response = await axios.post(
      `${API_URL}/api/auth/google/callback`,
      {
        code,
        redirectUri: `${window.location.origin}/auth/google/callback`
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Erro ao autenticar com Google');
  }
};

/**
 * Completa o registro com informações adicionais (telefone)
 */
export const completeGoogleRegistration = async (
  googleToken: string,
  phone: string
): Promise<GoogleAuthResponse> => {
  try {
    const response = await axios.post(
      `${API_URL}/api/auth/google/complete-registration`,
      {
        googleToken,
        phone
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Erro ao completar registro');
  }
};

/**
 * Gera um state seguro para OAuth (previne CSRF)
 */
function generateSecureState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Valida o token do Google no frontend (verificação adicional)
 */
export const validateGoogleToken = async (token: string): Promise<boolean> => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`
    );
    
    // Verificar se o token é válido e para o cliente correto
    return response.data.aud === GOOGLE_CLIENT_ID;
  } catch (error) {
    return false;
  }
};
