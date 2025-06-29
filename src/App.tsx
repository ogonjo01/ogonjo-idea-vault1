import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

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
// IMPORTANT: Changed from Admin to AdminPanel to match your component file name
import AdminPanel from "./pages/Admin"; // Corrected import name for your Admin component
import AdminRoute from "./components/AdminRoute"; // This is your route guard component
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import PrivateRoute from "./components/AdminRoute"; // Assuming you have a PrivateRoute for general user protection


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
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
            
            {/* General User Protected Routes (accessible to any logged-in user) */}
            {/* If Dashboard, Upload, Profile etc. need any logged-in user, wrap them with PrivateRoute */}
            <Route element={<AdminPanel />}> 
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/presentation/:id" element={<Presentation />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Admin Protected Route (accessible ONLY to admin users) */}
            {/* Here, AdminRoute will directly render its children (AdminPanel) */}
            <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />

            {/* Catch-all for 404 - make sure this is the LAST route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;