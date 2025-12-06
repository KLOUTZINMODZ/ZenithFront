import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationType } from '../types';

const NotificationDemo: React.FC = () => {
  const { addNotification } = useNotifications();

  const createNotification = (type: NotificationType) => {
    const notifications = {
      info: {
        title: 'Informação',
        message: 'Esta é uma notificação informativa.',
        type: 'info' as NotificationType,
      },
      success: {
        title: 'Sucesso!',
        message: 'Operação realizada com sucesso.',
        type: 'success' as NotificationType,
      },
      warning: {
        title: 'Atenção',
        message: 'Verifique suas configurações.',
        type: 'warning' as NotificationType,
      },
      error: {
        title: 'Erro',
        message: 'Ocorreu um erro ao processar sua solicitação.',
        type: 'error' as NotificationType,
      },
      transaction: {
        title: 'Transação',
        message: 'Sua transação foi processada.',
        type: 'transaction' as NotificationType,
        link: '/wallet',
      },
    };

    addNotification(notifications[type]);
  };


};

export default NotificationDemo;