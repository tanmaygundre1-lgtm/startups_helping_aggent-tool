import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoginPage from "../pages/auth/LoginPage";
import WelcomePage from "../pages/onboarding/WelcomePage";
import ApplicationEntryPage from "../pages/ApplicationEntryPage";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import ProtectedRoute from "./ProtectedRoute";

const PublicRoute = ({ children }) => {
  const { firebaseUser, loading, profileCompleted } = useAuth();
  if (loading) return <LoadingState />;
  if (firebaseUser)
    return (
      <Navigate
        to={profileCompleted ? "/app" : "/onboarding/welcome"}
        replace
      />
    );
  return children;
};

const RootEntry = () => {
  const { firebaseUser, loading, error, profileCompleted, refreshProfile } =
    useAuth();

  console.log("[AUTH DEBUG] RootEntry decision points:", {
    loading,
    userExists: !!firebaseUser,
    profileCompleted,
    error: !!error,
  });

  if (loading) return <LoadingState />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (error) return <ErrorState message={error} onRetry={refreshProfile} />;

  const destination = profileCompleted ? "/app" : "/onboarding/welcome";
  console.log("[AUTH DEBUG] Navigating to:", destination);
  return <Navigate to={destination} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route
      path="/login"
      element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      }
    />
    <Route element={<ProtectedRoute />}>
      <Route path="/onboarding/welcome" element={<WelcomePage />} />
      <Route path="/app" element={<ApplicationEntryPage />} />
    </Route>
    <Route path="/" element={<RootEntry />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
