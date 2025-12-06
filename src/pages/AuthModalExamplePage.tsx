import React from 'react';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, KeyRound } from 'lucide-react';
import AuthModal from '../components/AuthModal';
import AuthFullScreen from '../components/AuthFullScreen';
import { useAuthModal } from '../hooks/useAuthModal';
import { useIsMobile } from '../hooks/useIsMobile';


const AuthModalExamplePage: React.FC = () => {
  const { isOpen, mode, openModal, closeModal } = useAuthModal();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            🎮 Zenith Auth Modal
          </h1>
          <p className="text-gray-300 text-lg">
            Modal moderno de autenticação com animações fluidas
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Testar Modal</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {}
            <motion.button
              onClick={() => openModal('login')}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg hover:shadow-blue-500/50 transition-all"
            >
              <LogIn className="w-8 h-8 mx-auto mb-3" />
              <div className="font-semibold text-lg">Login</div>
              <div className="text-sm text-blue-100 mt-1">Entrar na conta</div>
            </motion.button>

            {}
            <motion.button
              onClick={() => openModal('register')}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              <UserPlus className="w-8 h-8 mx-auto mb-3" />
              <div className="font-semibold text-lg">Registrar</div>
              <div className="text-sm text-purple-100 mt-1">Criar conta nova</div>
            </motion.button>

            {}
            <motion.button
              onClick={() => openModal('forgot')}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white p-6 rounded-xl shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              <KeyRound className="w-8 h-8 mx-auto mb-3" />
              <div className="font-semibold text-lg">Recuperar</div>
              <div className="text-sm text-cyan-100 mt-1">Esqueci a senha</div>
            </motion.button>
          </div>

          <div className="mt-8 p-4 bg-black/20 rounded-lg">
            <h3 className="text-white font-semibold mb-2">✨ Recursos:</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>Animações suaves com Framer Motion</li>
              <li>Design responsivo (mobile/desktop)</li>
              <li>Validação completa de formulários</li>
              <li>Integração com APIs existentes</li>
              <li>Suporte a telefone opcional</li>
              <li>Recuperação de senha em 3 passos</li>
              <li>Acessibilidade (keyboard navigation)</li>
              <li>Feedback visual de erros/sucesso</li>
            </ul>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center text-gray-400 text-sm"
        >
          <p>Pressione ESC ou clique fora do modal para fechar</p>
        </motion.div>
      </div>

      {}
      {isMobile ? (
        isOpen && (
          <AuthFullScreen
            initialMode={mode}
            onClose={closeModal}
          />
        )
      ) : (
        <AuthModal
          isOpen={isOpen}
          onClose={closeModal}
          initialMode={mode}
        />
      )}
    </div>
  );
};

export default AuthModalExamplePage;
