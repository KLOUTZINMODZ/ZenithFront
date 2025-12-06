import React from 'react';
import { motion } from 'framer-motion';
import HomePageComponent from '../components/HomePage';
import NotificationDemo from '../components/NotificationDemo';

const HomePage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <NotificationDemo />
      <HomePageComponent />
    </motion.div>
  );
};

export default HomePage;