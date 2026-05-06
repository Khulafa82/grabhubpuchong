import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PublicLayout } from "@/components/site/PublicLayout";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import Guide from "./pages/Guide";
import Articles from "./pages/Articles";
import Contact from "./pages/Contact";
import StaffLogin from "./pages/StaffLogin";
import FirstTimePasswordChange from "./pages/FirstTimePasswordChange";
import ForgotPasswordRequest from "./pages/ForgotPasswordRequest";
import Register from "./pages/Register";
import RegistrationSuccess from "./pages/RegistrationSuccess";
import WalkInRegistration from "./pages/WalkInRegistration";
import Admin from "./pages/dashboards/Admin";
import Boss from "./pages/dashboards/Boss";
import ITTech from "./pages/dashboards/ITTech";
import SuperAdmin from "./pages/dashboards/SuperAdmin";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/contact" element={<Contact />} />
            </Route>
            <Route path="/staff-login" element={<StaffLogin />} />
            <Route path="/first-time-password-change" element={<FirstTimePasswordChange />} />
            <Route path="/forgot-password-request" element={<ForgotPasswordRequest />} />
            <Route path="/register" element={<Register />} />
            <Route path="/walk-in-registration" element={<WalkInRegistration />} />
            <Route path="/registration-success" element={<RegistrationSuccess />} />
            <Route path="/admin/*" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
            <Route path="/boss/*" element={<ProtectedRoute role="boss"><Boss /></ProtectedRoute>} />
            <Route path="/it-tech/*" element={<ProtectedRoute role="it_tech"><ITTech /></ProtectedRoute>} />
            <Route path="/super-admin/*" element={<ProtectedRoute role="super_admin"><SuperAdmin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
