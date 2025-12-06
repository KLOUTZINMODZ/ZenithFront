import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Home, RefreshCcw, Search } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 140,
        damping: 18,
        mass: 0.9,
      },
    },
  };

  const iconVariants = {
    initial: { rotate: -6, scale: 0.9 },
    animate: {
      rotate: [ -6, 4, -3, 3, 0 ],
      scale: [0.9, 1.05, 1, 1.03, 1],
      transition: {
        duration: 1.4,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatDelay: 2,
      },
    },
  };

  const floatingBadgeVariants = {
    initial: { y: 0 },
    animate: {
      y: [0, -4, 0, -2, 0],
      transition: {
        duration: 2.4,
        ease: 'easeInOut',
        repeat: Infinity,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 260,
        damping: 22,
        mass: 0.9,
        staggerChildren: 0.08,
      },
    },
  };

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <motion.div
        className="max-w-3xl w-full mx-auto text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        layout
      >
        <div className="flex justify-center mb-6">
          <motion.div
            className="relative inline-flex items-center justify-center"
            variants={iconVariants}
            initial="initial"
            animate="animate"
          >
            <div className="absolute -inset-6 rounded-full bg-purple-600/20 blur-2xl" aria-hidden="true" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-500/20 via-blue-500/10 to-transparent border border-purple-500/30" />
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-purple-600 via-indigo-600 to-sky-500 flex items-center justify-center shadow-2xl shadow-purple-900/40">
              <span className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-lg">404</span>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-xs sm:text-sm text-slate-300 mb-4"
          variants={floatingBadgeVariants}
          initial="initial"
          animate="animate"
        >
          <Compass className="w-3.5 h-3.5 text-purple-400" />
          <span>Ops, parece que essa rota está fora do minimapa</span>
        </motion.div>

        <motion.div
          className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/40 backdrop-blur-xl"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3">
            Página não encontrada
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-6">
            A rota que você tentou acessar não existe ou foi movida. Continue explorando o marketplace
            ou volte para a página inicial para encontrar itens, boosters e ofertas especiais.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 text-left">
            <motion.div
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/70"
              whileHover={{ y: -3, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20, mass: 0.8 }}
            >
              <div className="mt-0.5 rounded-lg bg-purple-600/20 p-2 text-purple-400">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200 tracking-wide uppercase">Explore o marketplace</p>
                <p className="text-xs text-slate-400 mt-0.5">Descubra novos itens, contas e boosts para seus jogos favoritos.</p>
              </div>
            </motion.div>

            <motion.div
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/70"
              whileHover={{ y: -3, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20, mass: 0.8 }}
            >
              <div className="mt-0.5 rounded-lg bg-emerald-500/15 p-2 text-emerald-400">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200 tracking-wide uppercase">Voltar para o lobby</p>
                <p className="text-xs text-slate-400 mt-0.5">Retorne à página inicial para ver campanhas em destaque.</p>
              </div>
            </motion.div>

            <motion.div
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/70"
              whileHover={{ y: -3, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20, mass: 0.8 }}
            >
              <div className="mt-0.5 rounded-lg bg-sky-500/15 p-2 text-sky-400">
                <RefreshCcw className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200 tracking-wide uppercase">Recarregar sessão</p>
                <p className="text-xs text-slate-400 mt-0.5">Atualize a página se você acredita que isso é um erro temporário.</p>
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-purple-900/40 hover:from-purple-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:ring-offset-2 focus:ring-offset-slate-900"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.96, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24, mass: 0.7 }}
            >
              <Compass className="w-4 h-4 mr-2" />
              Voltar para onde eu estava
            </motion.button>

            <motion.div
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 24, mass: 0.7 }}
            >
              <Link
                to="/"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-slate-600/80 bg-slate-900/60 text-slate-100 text-sm font-medium hover:bg-slate-800/90 hover:border-slate-500/80 focus:outline-none focus:ring-2 focus:ring-slate-500/60 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                <Home className="w-4 h-4 mr-2" />
                Ir para a página inicial
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
