// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Import your pages
import Landing from "./pages/Landing"; // This will now be at /auth
import Dashboard from "./pages/Dashboard"; // This will now be at /
import Presentation from "./pages/Presentation";
import Upload from "./pages/Upload";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";
import Features from "./pages/Features";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import FAQ from "./pages/FAQ";
import LearnMore from "./pages/LearnMore";
import AdminPanel from "./pages/Admin";
import AdminRoute from "./components/AdminRoute";
import PrivateRoute from "./components/PrivateRoute";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";


const queryClient = new QueryClient();

// Define a common MainLayout component that includes Header, Outlet, and Footer
const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // This function will be passed to the Header's onLogin prop.
  // It now navigates to the /auth path with a query parameter.
  const handleLoginSignupPrompt = () => {
    console.log("MainLayout: handleLoginSignupPrompt called. Navigating to /auth.");
    navigate('/auth?auth=true');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header is now rendered once, at the layout level */}
      {/* showSearch is true if on the Dashboard (which is now '/') */}
      <Header onLogin={handleLoginSignupPrompt} showSearch={location.pathname === '/'} />
      <main className="flex-1">
        <Outlet /> {/* This is where the nested route components will be rendered */}
      </main>
      <Footer /> {/* Footer is also rendered once at the layout level */}
    </div>
  );
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* The MainLayout wraps all routes that should share the Header and Footer */}
            <Route element={<MainLayout />}>
              {/* Public Routes - NO LOGIN REQUIRED */}
              {/* Dashboard is now the landing page */}
              <Route path="/" element={<Dashboard />} />
              <Route path="/presentation/:id" element={<Presentation />} /> {/* Publicly accessible */}

              {/* Authentication-related pages */}
              <Route path="/auth" element={<Landing />} /> {/* Landing page content moved to /auth */}
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />

              {/* Other Public Pages */}
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/features" element={<Features />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Terms />} /> {/* FIX: Removed duplicate 'element' attribute */}
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/learn-more" element={<LearnMore />} />

              {/* Authenticated Routes - LOGIN REQUIRED */}
              <Route element={<PrivateRoute />}>
                <Route path="/upload" element={<Upload />} />
                <Route path="/profile" element={<Profile />} />
                {/* Add any other features that require login here */}
              </Route>

              {/* Admin Protected Route */}
              <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            </Route>

            {/* Catch-all for 404 - place outside MainLayout if it should have no header/footer,
                or inside if it should. For now, kept outside as it's often a distinct page. */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
