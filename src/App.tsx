// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// IMPORTANT: Import Outlet, useNavigate, useLocation from react-router-dom
import { BrowserRouter, Routes, Route, Outlet, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Header from "@/components/Header"; // Import Header (it's now part of the layout)
import Footer from "@/components/Footer"; // Import Footer (it's now part of the layout)

// Import your pages
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
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
import AdminPanel from "./pages/Admin"; // Assuming your Admin component is named AdminPanel
import AdminRoute from "./components/AdminRoute";
import PrivateRoute from "./components/PrivateRoute"; // Your separate PrivateRoute
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";


const queryClient = new QueryClient();

// Define a common MainLayout component that includes Header, Outlet, and Footer
const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation(); // To check current path for Header's showSearch prop

  // This function will be passed to the Header's onLogin prop.
  // It handles navigation to the landing page with a query parameter.
  const handleLoginSignupPrompt = () => {
    console.log("MainLayout: handleLoginSignupPrompt called.");
    console.log("MainLayout: Current location.pathname before navigation:", location.pathname);

    // If not already on the landing page, navigate there with a query param.
    // The Landing page will then listen for this param to scroll to the form.
    if (location.pathname !== '/') {
      navigate('/?auth=true');
      console.log("MainLayout: Navigating to /?auth=true");
    } else {
      // If already on the landing page, just update the query param to trigger useEffect
      // This is important if a user is *already* on / and clicks Login/Signup in header
      navigate(location.pathname + '?auth=true' + location.hash, { replace: true });
      console.log("MainLayout: Updating current / path with ?auth=true");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header is now rendered once, at the layout level */}
      {/* showSearch prop is passed based on the current path (e.g., true for Dashboard) */}
      <Header onLogin={handleLoginSignupPrompt} showSearch={location.pathname === '/dashboard'} />
      <main className="flex-1">
        <Outlet /> {/* This is where the nested route components (like Landing, Dashboard, etc.) will be rendered */}
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
              {/* Public Routes (will get Header and Footer from MainLayout) */}
              <Route path="/" element={<Landing />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/features" element={<Features />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/learn-more" element={<LearnMore />} />
              {/* IMPORTANT: Remove duplicate /presentation/:id route here if it was present outside PrivateRoute */}
              {/* It should only be within PrivateRoute unless it's a public presentation */}
              {/* If "/presentations/:id" is public, keep it here. If it requires login, move it only under PrivateRoute. */}

              {/* General User Protected Routes (accessible to any logged-in user) */}
              {/* These routes will use the PrivateRoute component for auth checks, AND get Header/Footer from MainLayout */}
              <Route element={<PrivateRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/presentation/:id" element={<Presentation />} /> {/* This is likely the intended place for presentation */}
                <Route path="/upload" element={<Upload />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Admin Protected Route (accessible ONLY to admin users) */}
              {/* This route will check for admin role, AND get Header/Footer from MainLayout */}
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
