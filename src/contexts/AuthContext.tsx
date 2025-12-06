import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services';
import chatApi from '../services/chatApi';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
  updateProfile: (userData: Partial<User>) => Promise<boolean>;
  uploadProfilePhoto: (image: string) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  const normalizeUser = (u: any): User => {
    if (!u) return u;
    const avatar = u.avatar || u.profilePicture || null;
    const profilePicture = u.profilePicture || u.avatar || null;

    
    const id = String(u.id || u._id || u.userid || '');

    
    const cpfDigits = String(u.cpf || u.cpfCnpj || '')?.replace(/\D/g, '');
    const cpf = cpfDigits && cpfDigits.length === 11 ? cpfDigits : (u.cpf ? String(u.cpf) : undefined);

    
    let birthDate: string | undefined = undefined;
    try {
      const bdRaw = (u as any).birthDate;
      const candidate = typeof bdRaw === 'string'
        ? bdRaw
        : (bdRaw && typeof bdRaw === 'object' && ('$date' in bdRaw))
          ? (bdRaw as any).$date
          : (bdRaw instanceof Date ? bdRaw.toISOString() : undefined);
      if (candidate) {
        const d = new Date(candidate);
        if (!isNaN(d.getTime())) birthDate = d.toISOString().slice(0, 10);
      }
    } catch {}

    const normalized: any = { ...u, id, avatar, profilePicture };
    if (cpf) normalized.cpf = cpf;
    if (birthDate) normalized.birthDate = birthDate;
    return normalized as User;
  };

  useEffect(() => {

    const loadUser = async () => {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (savedUser && token) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(normalizeUser(parsedUser));
          

          try {
            const response = await authService.getProfile();
            if (response.success && response.data?.user) {
              const normalized = normalizeUser(response.data.user);
              setUser(normalized);
              localStorage.setItem('user', JSON.stringify(normalized));
            }
          } catch (error) {

          }
        } catch (error) {

          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    };
    
    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string; requires2FA?: boolean; tempToken?: string }> => {
    
    try {
      const response = await authService.login(email, password);
      
      
      if (response.success && response.requires2FA) {
        return { 
          success: true, 
          requires2FA: true, 
          tempToken: response.tempToken 
        };
      }
      
      if (response.success && response.data) {
        const normalized = normalizeUser(response.data.user);
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
        localStorage.setItem('token', response.data.token);
        return { success: true };
      }
      
      return { success: false, error: response.message || response.error || 'Credenciais inválidas' };
    } catch (error) {
      return { success: false, error: 'Erro ao conectar com o servidor' };
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, phone?: string): Promise<{ success: boolean; error?: string }> => {
    
    try {
      const response = await authService.register(name, email, password, phone);
      
      if (response.success && response.data) {
        const normalized = normalizeUser(response.data.user);
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
        localStorage.setItem('token', response.data.token);
        return { success: true };
      }
      
      return { success: false, error: response.message || response.error || 'Erro ao criar conta' };
    } catch (error) {
      return { success: false, error: 'Erro ao conectar com o servidor' };
    }
  }, []);

  const updateProfile = useCallback(async (userData: Partial<User>): Promise<boolean> => {
    setIsLoading(true);
    
    try {

      if (userData.email) {
        delete userData.email;
      }
      
      const response = await authService.updateProfile(userData);
      
      if (response.success && response.data?.user) {

        const anyData = response.data as any;
        const merged = {
          ...anyData.user,
          avatar: anyData.avatar?.url || anyData.user?.avatar,
          profilePicture: anyData.avatar?.url || anyData.user?.profilePicture,
        };
        const normalized = normalizeUser(merged);
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      setIsLoading(false);
      return false;
    }
  }, []);
  
  const uploadProfilePhoto = useCallback(async (image: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      let avatarUrl = '';
      if (typeof image === 'string' && image.startsWith('data:')) {
        const base = (chatApi.defaults.baseURL || '').replace(/\/$/, '');
        const res = await chatApi.post('/api/uploads/image-base64', {
          conversationId: 'profile',
          dataUrl: image,
          name: 'profile.jpg'
        });
        const relative = res?.data?.data?.url || '';
        avatarUrl = relative?.startsWith('http') ? relative : `${base}${relative}`;
      } else if (typeof image === 'string') {
        avatarUrl = image;
      }

      if (!avatarUrl) {
        setIsLoading(false);
        return false;
      }

      const updateResp = await authService.updateProfile({ avatar: avatarUrl } as any);
      if (updateResp.success && updateResp.data?.user) {
        const normalized = normalizeUser(updateResp.data.user);
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (error) {
      setIsLoading(false);
      return false;
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      
      setIsLoading(false);
      return response.success;
    } catch (error) {
      setIsLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback((clearAll = false) => {
    setUser(null);
    
    if (clearAll) {
      
            localStorage.clear();
    } else {
      
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('authToken');
    }
  }, []);

  // Método para atualizar usuário manualmente (ex: após vincular Google)
  const updateUser = useCallback((userData: User) => {
    console.log('🔄 [AuthContext] Atualizando usuário:', userData);
    const normalized = normalizeUser(userData);
    setUser(normalized);
    localStorage.setItem('user', JSON.stringify(normalized));
  }, []);

  
  const value = useMemo(
    () => ({ 
      user, 
      login, 
      register, 
      logout, 
      isLoading, 
      updateProfile,
      uploadProfilePhoto, 
      changePassword,
      updateUser
    }),
    [user, login, register, logout, isLoading, updateProfile, uploadProfilePhoto, changePassword, updateUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};