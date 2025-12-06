import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Instagram, Mail, MapPin, Phone } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Sobre Nós</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              O maior marketplace de games do Brasil. Compre, venda e troque com segurança total.
            </p>
            <div className="flex gap-3">
              <a
                href="https://wa.me/5511921122881"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-gray-800 hover:bg-purple-600 flex items-center justify-center transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-gray-400" />
              </a>
              <a
                href="https://instagram.com/zenithgg.suporte"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-gray-800 hover:bg-purple-600 flex items-center justify-center transition-colors"
              >
                <Instagram className="w-4 h-4 text-gray-400" />
              </a>
              <a
                href="mailto:contato.zenithgg@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-gray-800 hover:bg-purple-600 flex items-center justify-center transition-colors"
              >
                <Mail className="w-4 h-4 text-gray-400" />
              </a>
            </div>
          </div>

          {}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/marketplace" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link to="/boostings" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  Boosting
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  Como Funciona
                </Link>
              </li>
              <li>
                <Link to="/why-choose-us" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  Por que nos escolher?
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/support" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  Suporte
                </Link>
              </li>
            </ul>
          </div>

          {}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/refund" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  Política de Reembolso
                </Link>
              </li>
              <li>
                <Link to="/seller-terms" className="text-gray-400 hover:text-purple-400 text-sm transition-colors">
                  Termos para Vendedores
                </Link>
              </li>
            </ul>
          </div>

          {}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Contato</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-sm">contato.zenithgg@gmail.com</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-sm">(11) 92112-2881</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-sm">
                    São Paulo, SP<br />
                    Brasil
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
      
          </div>
        </div>
      </div>
    </footer>
  );
};
