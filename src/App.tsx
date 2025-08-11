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
import IdeaContent from '@/pages/IdeaContent';
import Dashboard from "./pages/Dashboard"; 
import StrategyDetail from './pages/StrategyDetail';
import UploadStrategyPage from "./pages/UploadStrategyPage";
import UploadInnovations from "./pages/upload-innovations";
import UploadLearning from "./pages/upload-learning";
import UploadSummaries from "./pages/upload-summaries";
import UploadWisdom from "./pages/upload-wisdom";
import UploadAudiobooks from "./pages/upload-audiobooks";
import Terms from './pages/Terms';
import PrivacyPolicy from './pages/Privacy';
import FAQ from './pages/FAQ';
import SeeAllPage from "./pages/SeeAllPage";
import StrategyList from './pages/StrategyList';

const queryClient = new QueryClient();

const MainLayout = ({ isAuthRoute }: { isAuthRoute?: boolean }) => {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const toggleProfileMenu = () => setIsProfileOpen(!isProfileOpen);

  useEffect(() => {
    if (loading || !user) {
      setUnreadCount(0);
      return;
    }

    const fetchInitialUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      if (error) console.error('MainLayout: Error fetching unread count:', error.message);
      else setUnreadCount(count || 0);
    };

    fetchInitialUnreadCount();

    const channel = supabase
      .channel('public:notifications_total_count')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        setUnreadCount((prev) => prev + 1);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.old.read === false && payload.new.read === true) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setUnreadCount(0); // Reset unread count on cleanup
    };
  }, [user, loading]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) console.error('Logout error:', error.message);
    // Ensure loading state is cleared after logout
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  if (loading && !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className={`min-h-screen flex flex-col ${isAuthRoute ? 'auth-layout' : ''}`}>
      <header className="fixed w-full top-0 z-50 bg-white shadow-md border-b border-gray-200 h-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-full justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl sm:text-2xl font-bold text-teal-700">OGONJO</h1>
            <nav className="hidden md:flex space-x-4">
              <NavLink to="/dashboard" className={({ isActive }) => `nav-link px-3 py-1 rounded-md ${isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'} hover:bg-blue-200 hover:text-blue-900 transition-all duration-300`} end>
                <span role="img" aria-label="dashboard" className="mr-1">📊</span> Investments
              </NavLink>
              <NavLink to="/ideas" className={({ isActive }) => `nav-link px-3 py-1 rounded-md ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'} hover:bg-green-200 hover:text-green-900 transition-all duration-300`} end>
                <span role="img" aria-label="innovations" className="mr-1">💡</span> Innovations
              </NavLink>
              <NavLink to="/courses" className={({ isActive }) => `nav-link px-3 py-1 rounded-md ${isActive ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'} hover:bg-purple-200 hover:text-purple-900 transition-all duration-300`} end>
                <span role="img" aria-label="learning" className="mr-1">🏫</span> Learning
              </NavLink>
              <NavLink to="/book-summaries" className={({ isActive }) => `nav-link px-3 py-1 rounded-md ${isActive ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'} hover:bg-yellow-200 hover:text-yellow-900 transition-all duration-300`} end>
                <span role="img" aria-label="summaries" className="mr-1">📚</span> Summaries
              </NavLink>
              <NavLink to="/quotes" className={({ isActive }) => `nav-link px-3 py-1 rounded-md ${isActive ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'} hover:bg-red-200 hover:text-red-900 transition-all duration-300`} end>
                <span role="img" aria-label="wisdom" className="mr-1">💬</span> Wisdom
              </NavLink>
              <NavLink to="/insights" className={({ isActive }) => `nav-link px-3 py-1 rounded-md ${isActive ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-700'} hover:bg-teal-200 hover:text-teal-900 transition-all duration-300`} end>
                <span role="img" aria-label="audio books" className="mr-1">🎧</span> Audio Books
                {unreadCount > 0 && <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center space-x-2">
            {!user ? (
              <div className="space-x-2 hidden md:flex">
                <NavLink
                  to="/auth?mode=signIn"
                  className="px-3 py-1 bg-teal-700 text-white rounded-md hover:bg-teal-800 text-sm transition-all duration-300"
                >
                  Login
                </NavLink>
                <NavLink
                  to="/auth?mode=signUp"
                  className="px-3 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm transition-all duration-300"
                >
                  Signup
                </NavLink>
              </div>
            ) : (
              <button
                onClick={toggleProfileMenu}
                className="flex items-center text-gray-700 hover:text-teal-700 focus:outline-none text-sm"
              >
                <span role="img" aria-label="profile" className="text-lg">👤</span>
                <span className="ml-1 hidden sm:inline">Profile</span>
              </button>
            )}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden text-gray-700 hover:text-teal-700 focus:outline-none text-2xl"
            >
              ☰
            </button>
          </div>
        </div>
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-14 right-4 w-48 bg-white shadow-lg rounded-lg p-2 z-50">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `block px-4 py-2 rounded-md text-gray-700 hover:bg-blue-100 hover:text-blue-900 ${isActive ? 'bg-blue-100 text-blue-800' : ''}`}
              onClick={toggleMobileMenu}
            >
              <span role="img" aria-label="dashboard" className="mr-1">📊</span> Investments
            </NavLink>
            <NavLink
              to="/ideas"
              className={({ isActive }) => `block px-4 py-2 rounded-md text-gray-700 hover:bg-green-100 hover:text-green-900 ${isActive ? 'bg-green-100 text-green-800' : ''}`}
              onClick={toggleMobileMenu}
            >
              <span role="img" aria-label="innovations" className="mr-1">💡</span> Innovations
            </NavLink>
            <NavLink
              to="/courses"
              className={({ isActive }) => `block px-4 py-2 rounded-md text-gray-700 hover:bg-purple-100 hover:text-purple-900 ${isActive ? 'bg-purple-100 text-purple-800' : ''}`}
              onClick={toggleMobileMenu}
            >
              <span role="img" aria-label="learning" className="mr-1">🏫</span> Learning
            </NavLink>
            <NavLink
              to="/book-summaries"
              className={({ isActive }) => `block px-4 py-2 rounded-md text-gray-700 hover:bg-yellow-100 hover:text-yellow-900 ${isActive ? 'bg-yellow-100 text-yellow-800' : ''}`}
              onClick={toggleMobileMenu}
            >
              <span role="img" aria-label="summaries" className="mr-1">📚</span> Summaries
            </NavLink>
            <NavLink
              to="/quotes"
              className={({ isActive }) => `block px-4 py-2 rounded-md text-gray-700 hover:bg-red-100 hover:text-red-900 ${isActive ? 'bg-red-100 text-red-800' : ''}`}
              onClick={toggleMobileMenu}
            >
              <span role="img" aria-label="wisdom" className="mr-1">💬</span> Wisdom
            </NavLink>
            <NavLink
              to="/insights"
              className={({ isActive }) => `block px-4 py-2 rounded-md text-gray-700 hover:bg-teal-100 hover:text-teal-900 ${isActive ? 'bg-teal-100 text-teal-800' : ''}`}
              onClick={toggleMobileMenu}
            >
              <span role="img" aria-label="audio books" className="mr-1">🎧</span> Audio Books
              {unreadCount > 0 && <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-full">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </NavLink>
            {!user && (
              <>
                <NavLink
                  to="/auth?mode=signIn"
                  className="block px-4 py-2 rounded-md text-gray-700 hover:bg-blue-100 hover:text-blue-900"
                  onClick={toggleMobileMenu}
                >
                  Login
                </NavLink>
                <NavLink
                  to="/auth?mode=signUp"
                  className="block px-4 py-2 rounded-md text-gray-700 hover:bg-green-100 hover:text-green-900"
                  onClick={toggleMobileMenu}
                >
                  Signup
                </NavLink>
              </>
            )}
            {user && (
              <NavLink
                to="/profile"
                className="block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                onClick={() => { toggleProfileMenu(); toggleMobileMenu(); }}
              >
                Profile
              </NavLink>
            )}
          </div>
        )}
        {/* Profile Menu */}
        {isProfileOpen && user && (
          <div className="absolute top-14 right-4 w-48 bg-white shadow-lg rounded-lg p-2 z-50 md:top-12">
            <NavLink to="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md" onClick={toggleProfileMenu}>Profile</NavLink>
            <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Logout</button>
          </div>
        )}
      </header>
      <main className="flex-1 pt-16 container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <Footer className="bg-gray-800 text-white py-6" />
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<MainLayout isAuthRoute={false} />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                
                <Route path="/strategy-list" element={<StrategyList />} /> 
                <Route path="/category/:title" element={<SeeAllPage />} />
                <Route path="/ideas" element={<Ideas />} />
                <Route path="/login" element={<Auth />} />
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
              </Route>
              <Route element={<MainLayout isAuthRoute={true} />}>
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/update-password" element={<UpdatePassword />} />
              </Route>
              <Route element={<PrivateRoute />}>
                <Route path="/upload-investments" element={<UploadStrategyPage />} /> {/* Replaced with UploadStrategyPage */}
                <Route path="/upload-innovations" element={<UploadInnovations />} />
                <Route path="/upload-learning" element={<UploadLearning />} />
                <Route path="/upload-summaries" element={<UploadSummaries />} />
                <Route path="/upload-wisdom" element={<UploadWisdom />} />
                <Route path="/upload-audiobooks" element={<UploadAudiobooks />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/upload" element={<CreateIdea />} />
                <Route path="/upload-quote" element={<UploadQuote />} />
                <Route path="/saved-ideas" element={<SavedIdeas />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;