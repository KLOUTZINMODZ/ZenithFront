import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { PollingProvider } from './contexts/PollingContext';
import { ProposalProvider } from './contexts/ProposalContext';
import { SocketProvider } from './contexts/SocketContext';
import { FavoritesProvider } from './contexts/FavoritesContext';


import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import HomePage from './pages/HomePage';
import LoginModalPage from './pages/LoginModalPage';
import RegisterModalPage from './pages/RegisterModalPage';
import ProtectedRoute from './components/ProtectedRoute';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import LoadingSpinner from './components/LoadingSpinner';
import GoogleAuthCallback from './pages/GoogleAuthCallback';
import CompleteGoogleRegistration from './pages/CompleteGoogleRegistration';

const lazyWithRetry = <T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>) => {
  const load = () =>
    factory()
      .then((module) => {
        sessionStorage.removeItem('zenith-force-reload');
        return module;
      })
      .catch((error) => {
        const message = error?.message || '';
        const shouldReload =
          error?.name === 'ChunkLoadError' ||
          message.includes('Failed to fetch dynamically imported module') ||
          message.includes('Importing a module script failed');
        if (shouldReload && !sessionStorage.getItem('zenith-force-reload')) {
          sessionStorage.setItem('zenith-force-reload', 'true');
          window.location.reload();
        }
        throw error;
      });
  return lazy(load);
};

const MarketplacePage = lazyWithRetry(() => import('./pages/MarketplacePage'));
const MarketplaceItemPage = lazyWithRetry(() => import('./pages/MarketplaceItemPageWrapper'));
const ForgotPasswordModalPage = lazyWithRetry(() => import('./pages/ForgotPasswordModalPage'));
const AuthModalExamplePage = lazyWithRetry(() => import('./pages/AuthModalExamplePage'));
const AccountPage = lazyWithRetry(() => import('./pages/AccountPage'));
const AchievementsPage = lazyWithRetry(() => import('./pages/AchievementsPage'));
const ComingSoonPage = lazyWithRetry(() => import('./pages/ComingSoonPage'));
const WalletPage = lazyWithRetry(() => import('./pages/WalletPage'));
const PurchasesPage = lazyWithRetry(() => import('./pages/PurchasesPage'));
const SalesPage = lazyWithRetry(() => import('./pages/SalesPage'));
const PurchaseDetailPage = lazyWithRetry(() => import('./pages/PurchaseDetailPage'));
const BoostingDetailPage = lazyWithRetry(() => import('./pages/BoostingDetailPage'));
const RateBoostingPage = lazyWithRetry(() => import('./pages/RateBoostingPage'));
const RateMarketplacePage = lazyWithRetry(() => import('./pages/RateMarketplacePage'));
const NewServicePage = lazyWithRetry(() => import('./pages/NewServicePage'));
const UserProfilePage = lazyWithRetry(() => import('./pages/UserProfilePage'));
const MyPostsPage = lazyWithRetry(() => import('./pages/MyPostsPage'));
const PostBoostingPage = lazyWithRetry(() => import('./pages/PostBoostingPage'));
const MyBoostingsPage = lazyWithRetry(() => import('./pages/MyBoostingsPage'));
const BrowseBoostingsPage = lazyWithRetry(() => import('./pages/BrowseBoostingsPage'));
const ProposalsPage = lazyWithRetry(() => import('./pages/ProposalsPage'));
const NotificationsPage = lazyWithRetry(() => import('./pages/NotificationsPage'));
const NotificationPreferencesPage = lazyWithRetry(() => import('./pages/NotificationPreferencesPage'));
const MessagesPage = lazyWithRetry(() => import('./pages/MessagesPage'));
const OpenOrdersPage = lazyWithRetry(() => import('./pages/OpenOrdersPage'));
const CheckoutPage = lazyWithRetry(() => import('./pages/CheckoutPage'));
const DepositConfirmPage = lazyWithRetry(() => import('./pages/DepositConfirmPage'));
const BuyItemPage = lazyWithRetry(() => import('./pages/BuyItemPage'));
const DepositPage = lazyWithRetry(() => import('./pages/DepositPage'));
const TransactionsHistoryPage = lazyWithRetry(() => import('./pages/TransactionsHistoryPage'));
const WithdrawPage = lazyWithRetry(() => import('./pages/WithdrawPage'));
const PrivacyPolicyPage = lazyWithRetry(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazyWithRetry(() => import('./pages/TermsOfServicePage'));
const RefundPolicyPage = lazyWithRetry(() => import('./pages/RefundPolicyPage'));
const SellerTermsPage = lazyWithRetry(() => import('./pages/SellerTermsPage'));
const FAQPage = lazyWithRetry(() => import('./pages/FAQPage'));
const SupportPage = lazyWithRetry(() => import('./pages/SupportPage'));
const HowItWorksPage = lazyWithRetry(() => import('./pages/HowItWorksPage'));
const WhyChooseUsPage = lazyWithRetry(() => import('./pages/WhyChooseUsPage'));
const ReviewsPage = lazyWithRetry(() => import('./pages/ReviewsPage'));
const AccountDeliveriesPage = lazyWithRetry(() => import('./pages/AccountDeliveriesPage'));
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage'));

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <SocketProvider>
          <FavoritesProvider>
            <PollingProvider>
              <ProposalProvider>
                <Router>
                  <ScrollToTop />
                  <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      <Route
                        path="/login"
                        element={
                          <ProtectedRoute requireAuth={false}>
                            <LoginModalPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/register"
                        element={
                          <ProtectedRoute requireAuth={false}>
                            <RegisterModalPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/forgot-password"
                        element={
                          <ProtectedRoute requireAuth={false}>
                            <ForgotPasswordModalPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Google OAuth Routes */}
                      <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
                      <Route path="/complete-registration" element={<CompleteGoogleRegistration />} />

                      <Route path="/auth-modal-example" element={<AuthModalExamplePage />} />

                      <Route path="/" element={<Layout />}>
                        <Route index element={<HomePage />} />
                        <Route
                          path="marketplace"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <MarketplacePage />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="marketplace/:id" element={<MarketplaceItemPage />} />
                        <Route path="users/:id" element={<UserProfilePage />} />
                        <Route
                          path="account"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <AccountPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="achievements"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <AchievementsPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="post-service"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <NewServicePage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="my-posts"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <MyPostsPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="be-booster" element={<ComingSoonPage title="Seja um Booster" />} />
                        <Route
                          path="post-boosting"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <PostBoostingPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="my-boostings"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <MyBoostingsPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="browse-boostings"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <BrowseBoostingsPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="checkout"
                          element={
                            <ProtectedRoute>
                              <CheckoutPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="deposit"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <DepositPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="deposit/confirm"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <DepositConfirmPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="buyitem"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <BuyItemPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="boosting/:boostingId/proposals"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <ProposalsPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="notifications"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <NotificationsPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="notifications/preferences"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <NotificationPreferencesPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="open-orders"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <OpenOrdersPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="purchases" element={<PurchasesPage />} />
                        <Route path="sales" element={<SalesPage />} />
                        <Route
                          path="wallet"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <WalletPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="wallet/withdraw"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <WithdrawPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="wallet/history"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <TransactionsHistoryPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="orders/:id" element={<PurchaseDetailPage />} />
                        <Route path="boostings/:id" element={<BoostingDetailPage />} />
                        <Route
                          path="rate/boosting/:id"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <RateBoostingPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="rate/marketplace/:id"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <RateMarketplacePage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="messages"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <MessagesPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="messages/:conversationId"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <MessagesPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="account-deliveries"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <AccountDeliveriesPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="account-deliveries/:deliveryId"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <AccountDeliveriesPage />
                            </ProtectedRoute>
                          }
                        />

                        <Route path="reviews" element={<ReviewsPage />} />
                        <Route path="privacy" element={<PrivacyPolicyPage />} />
                        <Route path="terms" element={<TermsOfServicePage />} />
                        <Route path="refund" element={<RefundPolicyPage />} />
                        <Route path="seller-terms" element={<SellerTermsPage />} />
                        <Route path="faq" element={<FAQPage />} />
                        <Route path="how-it-works" element={<HowItWorksPage />} />
                        <Route path="why-choose-us" element={<WhyChooseUsPage />} />

                        <Route
                          path="support"
                          element={
                            <ProtectedRoute requireAuth={true}>
                              <SupportPage />
                            </ProtectedRoute>
                          }
                        />

                        {/* Catch-all 404 route */}
                        <Route path="*" element={<NotFoundPage />} />
                      </Route>
                    </Routes>
                  </Suspense>
                  <PWAInstallPrompt />
                </Router>
              </ProposalProvider>
            </PollingProvider>
          </FavoritesProvider>
        </SocketProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;