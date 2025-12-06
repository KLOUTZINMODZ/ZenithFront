import api from './api';

interface OrderItem {
  _id: string;
  title: string;
  image: string;
}

interface OrderSeller {
  _id: string;
  name: string;
}

interface OrderResponse {
  _id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'disputed';
  price: number;
  createdAt: string;
  item: OrderItem;
  seller: OrderSeller;
}

interface OrdersListResponse {
  success: boolean;
  data?: {
    orders: OrderResponse[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
  message?: string;
  error?: string;
}

interface OrderDetailResponse {
  success: boolean;
  data?: {
    order: {
      _id: string;
      orderNumber: string;
      buyerId: string;
      sellerId: string;
      itemId: string;
      status: string;
      price: number;
      fee: number;
      sellerReceives: number;
      notes?: string;
      createdAt: string;
      deliveryStatus: string;
      deliveryDetails: any;
    };
    item: {
      _id: string;
      title: string;
      game: string;
      price: number;
      image: string;
      category: string;
      description: string;
    };
    buyer: {
      _id: string;
      name: string;
      avatar?: string;
    };
    seller: {
      _id: string;
      name: string;
      avatar?: string;
    };
    transaction: {
      _id: string;
      type: string;
      amount: number;
      status: string;
      createdAt: string;
    };
    actions: {
      canCancel: boolean;
      canConfirmDelivery: boolean;
      canDispute: boolean;
    };
  };
  message?: string;
  error?: string;
}

interface CreateOrderResponse {
  success: boolean;
  message?: string;
  data?: {
    order: {
      _id: string;
      orderNumber: string;
      buyerId: string;
      sellerId: string;
      itemId: string;
      status: string;
      price: number;
      fee: number;
      notes?: string;
      createdAt: string;
    };
    item: {
      title: string;
      image: string;
    };
    seller: {
      name: string;
    };
  };
  error?: string;
}

interface UpdateOrderStatusResponse {
  success: boolean;
  message?: string;
  data?: {
    order: {
      _id: string;
      status: string;
      deliveryStatus: string;
      updatedAt: string;
    };
  };
  error?: string;
}

const orderService = {
  getOrders: async (params: {
    page?: number;
    limit?: number;
    type?: 'purchases' | 'sales';
    status?: string;
  }): Promise<OrdersListResponse> => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await api.get<OrdersListResponse>(`/orders?${queryParams.toString()}`);
      

      if (response.data && response.data.data) {

        if (!Array.isArray(response.data.data.orders)) {
          response.data.data.orders = [];
        }
        

        if (!response.data.data.pagination) {
          response.data.data.pagination = {
            total: 0,
            page: params.page || 1,
            limit: params.limit || 10,
            pages: 0
          };
        }
      } else if (response.data) {

        response.data.data = {
          orders: [],
          pagination: {
            total: 0,
            page: params.page || 1,
            limit: params.limit || 10,
            pages: 0
          }
        };
      }
      
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const errorResponse = error.response.data as OrdersListResponse;

        if (!errorResponse.data) {
          errorResponse.data = {
            orders: [],
            pagination: {
              total: 0,
              page: params.page || 1,
              limit: params.limit || 10,
              pages: 0
            }
          };
        } else if (!Array.isArray(errorResponse.data.orders)) {
          errorResponse.data.orders = [];
        }
        return errorResponse;
      }
      return { 
        success: false, 
        message: 'Erro de conexão com o servidor',
        data: {
          orders: [],
          pagination: {
            total: 0,
            page: params.page || 1,
            limit: params.limit || 10,
            pages: 0
          }
        }
      };
    }
  },

  getOrderById: async (id: string): Promise<OrderDetailResponse> => {
    try {
      const response = await api.get<OrderDetailResponse>(`/orders/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data as OrderDetailResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  },

  createOrder: async (itemId: string, notes?: string): Promise<CreateOrderResponse> => {
    try {
      const response = await api.post<CreateOrderResponse>('/orders', {
        itemId,
        notes
      });
      

      if (response.data && !response.data.data) {
        response.data.data = {
          order: {
            _id: '',
            orderNumber: '',
            buyerId: '',
            sellerId: '',
            itemId: '',
            status: 'pending',
            price: 0,
            fee: 0,
            createdAt: new Date().toISOString()
          },
          item: {
            title: '',
            image: ''
          },
          seller: {
            name: ''
          }
        };
      }
      
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const errorResponse = error.response.data as CreateOrderResponse;

        if (!errorResponse.data) {
          errorResponse.data = {
            order: {
              _id: '',
              orderNumber: '',
              buyerId: '',
              sellerId: '',
              itemId: '',
              status: 'pending',
              price: 0,
              fee: 0,
              createdAt: new Date().toISOString()
            },
            item: {
              title: '',
              image: ''
            },
            seller: {
              name: ''
            }
          };
        }
        return errorResponse;
      }
      return { 
        success: false, 
        message: 'Erro de conexão com o servidor',
        data: {
          order: {
            _id: '',
            orderNumber: '',
            buyerId: '',
            sellerId: '',
            itemId: '',
            status: 'pending',
            price: 0,
            fee: 0,
            createdAt: new Date().toISOString()
          },
          item: {
            title: '',
            image: ''
          },
          seller: {
            name: ''
          }
        }
      };
    }
  },

  updateOrderStatus: async (
    id: string,
    action: 'confirm_delivery' | 'cancel' | 'dispute',
    deliveryDetails?: any
  ): Promise<UpdateOrderStatusResponse> => {
    try {
      const response = await api.put<UpdateOrderStatusResponse>(`/orders/${id}/status`, {
        action,
        deliveryDetails
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return error.response.data as UpdateOrderStatusResponse;
      }
      return { success: false, message: 'Erro de conexão com o servidor' };
    }
  }
};

export default orderService;