import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";

const Login = lazy(() => import("./pages/Login"));
const Loading = lazy(() => import("./pages/Loading"));
const ModeratorHome = lazy(() => import("./pages/moderator/ModeratorHome"));
const CreateGradeSheet = lazy(() => import("./pages/moderator/CreateGradeSheet"));
const GradeSheetHistory = lazy(() => import("./pages/moderator/GradeSheetHistory"));
const GradeSheetDetail = lazy(() => import("./pages/moderator/GradeSheetDetail"));
const PlayerAverages = lazy(() => import("./pages/moderator/PlayerAverages"));
const ManageMatches = lazy(() => import("./pages/moderator/ManageMatches"));
const ManagePlayers = lazy(() => import("./pages/moderator/ManagePlayers"));
const MvpLeaderboard = lazy(() => import("./pages/moderator/MvpLeaderboard"));
const ManageEvents = lazy(() => import("./pages/moderator/ManageEvents"));
const ModeratorSettings = lazy(() => import("./pages/moderator/Settings"));
const PlayerHome = lazy(() => import("./pages/player/PlayerHome"));
const LatestGradeSheet = lazy(() => import("./pages/player/LatestGradeSheet"));
const PlayerDashboard = lazy(() => import("./pages/player/PlayerDashboard"));
const MatchesList = lazy(() => import("./pages/player/MatchesList"));
const PlayerGradeSheetHistory = lazy(() => import("./pages/player/GradeSheetHistory"));
const PlayerGradeSheetDetail = lazy(() => import("./pages/player/GradeSheetDetail"));
const TeamPerformance = lazy(() => import("./pages/player/TeamPerformance"));
const EventsList = lazy(() => import("./pages/player/EventsList"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
    <Suspense fallback={<div className="min-h-screen gradient-dark" />}>
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
        <Route path="/moderator/mvp" element={<ProtectedRoute role="moderator"><MvpLeaderboard /></ProtectedRoute>} />
        <Route path="/moderator/settings" element={<ProtectedRoute role="moderator"><ModeratorSettings /></ProtectedRoute>} />
        <Route path="/moderator/events" element={<ProtectedRoute role="moderator"><ManageEvents /></ProtectedRoute>} />
        
        {/* Player Routes */}
        <Route path="/player" element={<ProtectedRoute role="player"><PlayerHome /></ProtectedRoute>} />
        <Route path="/player/latest" element={<ProtectedRoute role="player"><LatestGradeSheet /></ProtectedRoute>} />
        <Route path="/player/history" element={<ProtectedRoute role="player"><PlayerGradeSheetHistory /></ProtectedRoute>} />
        <Route path="/player/sheet/:id" element={<ProtectedRoute role="player"><PlayerGradeSheetDetail /></ProtectedRoute>} />
        <Route path="/player/dashboard" element={<ProtectedRoute role="player"><PlayerDashboard /></ProtectedRoute>} />
        <Route path="/player/team-performance" element={<ProtectedRoute role="player"><TeamPerformance /></ProtectedRoute>} />
        <Route path="/player/matches" element={<ProtectedRoute role="player"><MatchesList /></ProtectedRoute>} />
        <Route path="/player/events" element={<ProtectedRoute role="player"><EventsList /></ProtectedRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
