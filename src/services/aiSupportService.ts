import chatApi from './chatApi';

export interface AnalyzeRequest {
  text: string;
  context?: any;
  locale?: string; 
}

export interface AnalyzeResponse {
  success: boolean;
  intent?: string;
  confidence?: number;
  entities?: Record<string, any>;
  answer?: string;
  citations?: Array<{ title?: string; url?: string; snippet?: string }>; 
  suggestedActions?: Array<{ type: string; payload?: any; label?: string }>;
  message?: string;
}

export async function analyzeSupport(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  try {
    const res = await chatApi.post('/api/ai/support/analyze', req);
    return res.data as AnalyzeResponse;
  } catch (error: any) {
    return { success: false, message: error?.response?.data?.message || 'Falha na análise de IA' };
  }
}

export async function suggestHelpTopics(context?: any): Promise<{ success: boolean; topics: string[]; message?: string }> {
  try {
    const res = await chatApi.post('/api/ai/support/suggest', { context });
    return res.data;
  } catch (error: any) {
    return { success: false, topics: [], message: error?.response?.data?.message || 'Falha ao sugerir tópicos' };
  }
}

export default { analyzeSupport, suggestHelpTopics };
