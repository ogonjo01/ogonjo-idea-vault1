import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, NavLink, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/services/supabase";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import PrivateRoute from './components/PrivateRoute';
import Ideas from "./pages/Ideas";
import Courses from "./pages/Courses";
import BookSummaries from "./pages/BookSummaries";
import Quotes from "./pages/Quotes";
import AudibleBooks from "./pages/AudibleBooks";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import NotFound from "./pages/NotFound";
import IdeaDetail from "./pages/IdeaDetail";
import CourseDetail from "./pages/CourseDetail";
import ChapterContent from "./pages/ChapterContent";
import BookSummaryDetail from "./pages/BookSummaryDetail";
import QuoteList from "./pages/QuoteList";
import UploadQuote from "./pages/UploadQuote";
import SavedIdeas from "./pages/SavedIdeas";
import CreateIdea from "./pages/CreateIdeaScreen";
import Notifications from "./pages/Notifications";
import Pricing from "./pages/Pricing";
import CategoryExplore from "./pages/CategoryExplore";
import IdeaList from "./pages/IdeaList";
import Profile from "./pages/Profile";
import LandingPage from "./pages/LandingPage";
import IdeaContent from '@/pages/IdeaContent';
import Dashboard from "./pages/Dashboard"; 
import StrategyDetail from './pages/StrategyDetail';
import UploadInvestments from "./pages/upload-investments";
import UploadInnovations from "./pages/upload-innovations";
import UploadLearning from "./pages/upload-learning";
import UploadSummaries from "./pages/upload-summaries";
import UploadWisdom from "./pages/upload-wisdom";
import UploadAudiobooks from "./pages/upload-audiobooks";
import Terms from './pages/Terms';
import PrivacyPolicy from './pages/Privacy';
import FAQ from './pages/FAQ';

const queryClient = new QueryClient();

const MainLayout = () => { // Removed isAuthRoute prop
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  // Mobile menu state and logic can be simplified or moved if this layout is only for desktop

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed w-full top-0 z-50 bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-[var(--theme-color-accent)]">OGONJO</h1>
            </div>
            {/* Simplified Nav for example */}
            <nav>
              {user ? (
                <button onClick={() => signOut()}>Logout</button>
              ) : (
                <NavLink to="/auth">Login</NavLink>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 pt-20 container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  const [appIsReady, setAppIsReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        const onboardingStatus = localStorage.getItem('onboardingComplete');
        setOnboardingComplete(onboardingStatus === 'true');
      } catch (e) {
        console.warn('App: Error checking onboarding status:', e);
      } finally {
        setAppIsReady(true);
      }
    };

    prepareApp();
  }, []);

  if (!appIsReady || onboardingComplete === null) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[var(--theme-color-accent)]"></div>
        <p className="mt-4 text-[var(--theme-color-dark-text)]">Loading app...</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {onboardingComplete === false ? (
                <Route path="/" element={<Onboarding />} />
              ) : (
                <>
                  <Route path="/" element={<MainLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} /> 
                    <Route path="/ideas" element={<Ideas />} />
                    <Route path="/idea-list" element={<IdeaList />} />
                    <Route path="/idea/:id" element={<IdeaDetail />} />
                    <Route path="/idea-content/:id" element={<IdeaContent />} />

                    <Route path="/courses" element={<Courses />} />
                    <Route path="/course/:courseId" element={<CourseDetail />} />
                    <Route path="/course/:courseId/chapters/:chapterId" element={<ChapterContent />} />

                    <Route path="/book-summaries" element={<BookSummaries />} />
                    <Route path="/book-summary/:id" element={<BookSummaryDetail />} />
                    <Route path="/strategy-detail/:id" element={<StrategyDetail />} />
                    <Route path="/quotes" element={<Quotes />} />
                    <Route path="/quote-list" element={<QuoteList />} />

                    <Route path="/insights" element={<AudibleBooks />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/category-explore" element={<CategoryExplore />} />
                    <Route path="/book-summary/:id" element={<BookSummaryDetail />} />

                    <Route path="/terms" element={<Terms />} />  
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/faq" element={<FAQ />} /> 

                    <Route path="/upload-investments" element={<UploadInvestments />} />
                    <Route path="/upload-innovations" element={<UploadInnovations />} />
                    <Route path="/upload-learning" element={<UploadLearning />} />
                    <Route path="/upload-summaries" element={<UploadSummaries />} />
                    <Route path="/upload-wisdom" element={<UploadWisdom />} />
                    <Route path="/upload-audiobooks" element={<UploadAudiobooks />} />

                    <Route element={<PrivateRoute />}>
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/upload" element={<CreateIdea />} />
                      <Route path="/upload-quote" element={<UploadQuote />} />
                      <Route path="/saved-ideas" element={<SavedIdeas />} />
                    </Route>
                  </Route>
                  {/* Standalone Auth Routes are now siblings */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/update-password" element={<UpdatePassword />} />
                </>
              )}
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;