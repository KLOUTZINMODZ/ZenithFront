import chatApi from './chatApi';


export interface Review {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email?: string;
    profileImage?: string;
  };
  targetId: string;
  targetType: 'User' | 'MarketItem';
  orderId?: string;
  orderStatus?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'open';
  rating: number;
  title?: string;
  comment?: string;
  isVerifiedPurchase: boolean;
  isHelpful: number;
  isNotHelpful: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}


export interface ReviewStats {
  average: number;
  count: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}


export interface ReviewsResponse {
  success: boolean;
  data: {
    ratings: Review[];
    stats: ReviewStats;
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
  message?: string;
}


export interface CreateReviewData {
  targetId: string;
  targetType: 'user' | 'item';
  rating: number;
  title?: string;
  comment?: string;
  orderId?: string;
}


export const createPurchaseReview = async (payload: { purchaseId: string; rating: number; title?: string; comment?: string; }): Promise<Review> => {
  try {
    const response = await chatApi.post('/api/ratings', payload);
    if (!response.data.success) throw new Error(response.data.message || 'Erro ao criar avaliação');
    return response.data.data as Review;
  } catch (error: any) {
    if (error.response) throw new Error(error.response?.data?.message || 'Erro ao criar avaliação');
    throw error;
  }
};


export const createReview = async (reviewData: CreateReviewData): Promise<Review> => {
  try {
    const response = await chatApi.post('/api/ratings', reviewData);
    if (!response.data.success) throw new Error(response.data.message || 'Erro ao criar avaliação');
    return response.data.data as Review;
  } catch (error: any) {
    if (error.response) throw new Error(error.response?.data?.message || 'Erro ao criar avaliação');
    throw error;
  }
};


export const getUserReviews = async (
  userId: string, 
  page: number = 1, 
  limit: number = 10
): Promise<ReviewsResponse['data']> => {
  try {
    const response = await chatApi.get<ReviewsResponse>(
      `/api/ratings/user/${userId}?page=${page}&limit=${limit}`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro ao buscar avaliações');
    }
    
    return response.data.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar avaliações');
    }
    throw error;
  }
};


export const getReceivedReviews = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
  opts?: { email?: string }
): Promise<ReviewsResponse['data']> => {
  try {
    const emailQuery = opts?.email ? `&email=${encodeURIComponent(opts.email)}` : '';
    const response = await chatApi.get<ReviewsResponse>(
      `/api/ratings/user/${userId}?page=${page}&limit=${limit}${emailQuery}`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro ao buscar avaliações');
    }
    
    return response.data.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar avaliações');
    }
    throw error;
  }
};


export const updateReview = async (
  reviewId: string, 
  updateData: Partial<CreateReviewData>
): Promise<Review> => {
  try {
    const response = await chatApi.put(`/api/ratings/${reviewId}`, updateData);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro ao atualizar avaliação');
    }
    
    return response.data.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response?.data?.message || 'Erro ao atualizar avaliação');
    }
    throw error;
  }
};


export const deleteReview = async (reviewId: string): Promise<void> => {
  try {
    const response = await chatApi.delete(`/api/ratings/${reviewId}`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro ao deletar avaliação');
    }
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response?.data?.message || 'Erro ao deletar avaliação');
    }
    throw error;
  }
};


export const checkUserVoteStatus = async (reviewId: string): Promise<{hasVoted: boolean, userVote: string | null}> => {
  try {
    const response = await chatApi.get(`/api/ratings/${reviewId}/vote-status`);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro ao verificar status do voto');
    }
    
    return response.data.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response?.data?.message || 'Erro ao verificar status do voto');
    }
    throw error;
  }
};


export const markReviewHelpful = async (reviewId: string, isHelpful: boolean): Promise<{hasVoted: boolean, userVote: string, isHelpful: number, isNotHelpful: number}> => {
  try {
    const response = await chatApi.post(`/api/ratings/${reviewId}/helpful`, {
      isHelpful
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro ao marcar avaliação');
    }
    
    return response.data.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response?.data?.message || 'Erro ao marcar avaliação');
    }
    throw error;
  }
};


export const getPurchaseReview = async (purchaseId: string): Promise<{ review: Review | null; eligible: boolean; role: 'buyer' | 'seller' } > => {
  try {
    const response = await chatApi.get(`/api/purchases/${purchaseId}/review`);
    if (!response.data.success) throw new Error(response.data.message || 'Erro ao buscar avaliação');
    return response.data.data;
  } catch (error: any) {
    if (error.response) throw new Error(error.response?.data?.message || 'Erro ao buscar avaliação');
    throw error;
  }
};

export default {
  createReview,
  getUserReviews,
  getReceivedReviews,
  updateReview,
  deleteReview,
  markReviewHelpful,
  checkUserVoteStatus,
  createPurchaseReview,
  getPurchaseReview
};
