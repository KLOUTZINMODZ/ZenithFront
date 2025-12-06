import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}


class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {

    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {

        

    this.setState({
      error,
      errorInfo
    });


    if (error.message.includes("Cannot read properties of undefined (reading '_id')")) {
            try {

        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('unified_chat_') ||
            key.startsWith('chat_cache_') ||
            key.startsWith('message_cache_') ||
            key.startsWith('conversation_cache_')
          )) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
                  });
      } catch (cleanupError) {
              }
    }
  }

  handleReload = () => {

    window.location.reload();
  };

  handleRetry = () => {

    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-8">
          <div className="max-w-md text-center">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            
            <h1 className="text-2xl font-bold mb-4">
              Erro no Sistema de Chat
            </h1>
            
            <p className="text-gray-300 mb-6">
              Ocorreu um erro inesperado no sistema de chat. 
              Isso pode ser devido a dados corrompidos no cache.
            </p>

            {this.state.error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-red-400 mb-2">Detalhes do Erro:</h3>
                <p className="text-sm text-red-200 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex space-x-4 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tentar Novamente</span>
              </button>
              
              <button
                onClick={this.handleReload}
                className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Página</span>
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-6">
              Se o problema persistir, entre em contato com o suporte.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChatErrorBoundary;
