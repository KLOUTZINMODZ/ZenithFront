import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://zenithggapi.vercel.app/api/v1';


export interface User {
  _id: string;
  userid: string;
  name: string;
  email: string;
  avatar?: string;
  profilePicture?: string;
  rating: number;
  totalSales: number;
  totalRatings: number;
  joinDate: string;
  isActive: boolean;
  isVerified: boolean;
}


export interface UserResponse {
  success: boolean;
  data: User;
  message?: string;
}


export const getUserById = async (id: string): Promise<User> => {
  try {
    const response = await axios.get<UserResponse>(`${API_BASE_URL}/users/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro ao buscar usuário');
    }
    
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error('Usuário não encontrado');
      }
      throw new Error(error.response?.data?.message || 'Erro ao buscar usuário');
    }
    throw error;
  }
};

export default {
  getUserById
};
