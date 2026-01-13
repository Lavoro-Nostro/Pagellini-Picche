import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Loading from "./pages/Loading";
import ModeratorHome from "./pages/moderator/ModeratorHome";
import CreateGradeSheet from "./pages/moderator/CreateGradeSheet";
import GradeSheetHistory from "./pages/moderator/GradeSheetHistory";
import GradeSheetDetail from "./pages/moderator/GradeSheetDetail";
import PlayerAverages from "./pages/moderator/PlayerAverages";
import ManageMatches from "./pages/moderator/ManageMatches";
import ManagePlayers from "./pages/moderator/ManagePlayers";
import PlayerHome from "./pages/player/PlayerHome";
import LatestGradeSheet from "./pages/player/LatestGradeSheet";
import PlayerDashboard from "./pages/player/PlayerDashboard";
import MatchesList from "./pages/player/MatchesList";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role?: 'moderator' | 'player' }) => {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen gradient-dark" />;
  }

  // Check for authenticated user with valid session
  if (!user || !profile) {
    return <Navigate to="/" replace />;
  }

  // Role check uses server-verified profile data
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'moderator' ? '/moderator' : '/player'} replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen gradient-dark" />;
  }

  if (user && profile) {
    return <Navigate to="/loading" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/loading" element={<ProtectedRoute><Loading /></ProtectedRoute>} />
      
      {/* Moderator Routes */}
      <Route path="/moderator" element={<ProtectedRoute role="moderator"><ModeratorHome /></ProtectedRoute>} />
      <Route path="/moderator/create" element={<ProtectedRoute role="moderator"><CreateGradeSheet /></ProtectedRoute>} />
      <Route path="/moderator/history" element={<ProtectedRoute role="moderator"><GradeSheetHistory /></ProtectedRoute>} />
      <Route path="/moderator/sheet/:id" element={<ProtectedRoute role="moderator"><GradeSheetDetail /></ProtectedRoute>} />
      <Route path="/moderator/averages" element={<ProtectedRoute role="moderator"><PlayerAverages /></ProtectedRoute>} />
      <Route path="/moderator/matches" element={<ProtectedRoute role="moderator"><ManageMatches /></ProtectedRoute>} />
      <Route path="/moderator/players" element={<ProtectedRoute role="moderator"><ManagePlayers /></ProtectedRoute>} />
      
      {/* Player Routes */}
      <Route path="/player" element={<ProtectedRoute role="player"><PlayerHome /></ProtectedRoute>} />
      <Route path="/player/latest" element={<ProtectedRoute role="player"><LatestGradeSheet /></ProtectedRoute>} />
      <Route path="/player/dashboard" element={<ProtectedRoute role="player"><PlayerDashboard /></ProtectedRoute>} />
      <Route path="/player/matches" element={<ProtectedRoute role="player"><MatchesList /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
