import React from 'react';
import { motion } from 'framer-motion';
import Marketplace from '../components/Marketplace';

const MarketplacePage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Marketplace />
    </motion.div>
  );
};

export default MarketplacePage;