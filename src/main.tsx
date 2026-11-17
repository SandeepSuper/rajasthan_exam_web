import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { AppLayout, GuestOnly, RequireAuth } from './components/Layout';
import { ForgotPasswordPage, LoginPage, SignupPage, VerifyEmailPage } from './pages/AuthPages';
import { HomePage } from './pages/HomePage';
import { ExamDetailPage, LiveTestsPage, PurchasePage } from './pages/ExamPages';
import { ResultPage, TestPage } from './pages/TestPages';
import { LeaderboardPage, PerformancePage } from './pages/StatsPages';
import { CurrentAffairsPage, NotFoundPage, NotificationsPage } from './pages/InfoPages';
import { CommunityPage, PostDetailPage } from './pages/CommunityPages';
import { ProfilePage, ReferralPage } from './pages/ProfilePages';
import './styles.css';

function App() {
  return (
    <Routes>
      {/* Auth screens */}
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><SignupPage /></GuestOnly>} />
      <Route path="/verify-email" element={<GuestOnly><VerifyEmailPage /></GuestOnly>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Full-screen test engine */}
      <Route path="/test/:testId" element={<RequireAuth><TestPage /></RequireAuth>} />

      {/* Normal pages with header + nav */}
      <Route element={<AppLayout />}>
        {/* Public: anyone can browse */}
        <Route index element={<HomePage />} />
        <Route path="/exam/:examId" element={<ExamDetailPage />} />
        <Route path="/live" element={<LiveTestsPage />} />
        <Route path="/current-affairs" element={<CurrentAffairsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Login required */}
        <Route path="/exam/:examId/buy" element={<RequireAuth><PurchasePage /></RequireAuth>} />
        <Route path="/test/:testId/result" element={<RequireAuth><ResultPage /></RequireAuth>} />
        <Route path="/leaderboard" element={<RequireAuth><LeaderboardPage /></RequireAuth>} />
        <Route path="/performance" element={<RequireAuth><PerformancePage /></RequireAuth>} />
        <Route path="/community" element={<RequireAuth><CommunityPage /></RequireAuth>} />
        <Route path="/community/:postId" element={<RequireAuth><PostDetailPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/referral" element={<RequireAuth><ReferralPage /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
