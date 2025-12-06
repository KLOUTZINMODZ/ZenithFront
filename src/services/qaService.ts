import chatApi from './chatApi';

export interface QAQuestion {
  _id: string;
  itemId: string;
  buyerId: string;
  sellerId: string;
  question: string;
  answer?: string | null;
  status: 'pending' | 'answered';
  createdAt: string;
  answeredAt?: string | null;
  buyerSnapshot?: { _id: string; name: string; avatar?: string | null } | null;
  sellerSnapshot?: { _id: string; name: string; avatar?: string | null } | null;
}

export interface ListResponse {
  success: boolean;
  data?: { questions: QAQuestion[] };
  message?: string;
}

export interface CreateResponse {
  success: boolean;
  data?: { question: QAQuestion };
  message?: string;
}

export interface ReportResponse {
  success: boolean;
  data?: { reportId: string };
  message?: string;
}

const qaService = {
  async listByItem(itemId: string): Promise<ListResponse> {
    const res = await chatApi.get(`/api/qa/items/${encodeURIComponent(itemId)}/questions`);
    return res.data as ListResponse;
  },

  async createQuestion(itemId: string, question: string): Promise<CreateResponse> {
    const res = await chatApi.post(`/api/qa/items/${encodeURIComponent(itemId)}/questions`, { question });
    return res.data as CreateResponse;
  },

  async answerQuestion(questionId: string, answer: string): Promise<CreateResponse> {
    const res = await chatApi.post(`/api/qa/questions/${encodeURIComponent(questionId)}/answer`, { answer });
    return res.data as CreateResponse;
  },

  async reportQuestion(questionId: string, payload: { reason: string; description: string }): Promise<ReportResponse> {
    const res = await chatApi.post(`/api/qa/questions/${encodeURIComponent(questionId)}/report`, payload);
    return res.data as ReportResponse;
  }
};

export default qaService;
