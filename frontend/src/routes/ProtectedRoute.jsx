import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import { useAuth } from "../hooks/useAuth";

const ProtectedRoute = () => {
  const { firebaseUser, loading, error, refreshProfile } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState />;
  if (!firebaseUser)
    return <Navigate to="/login" replace state={{ from: location }} />;
  if (error) return <ErrorState message={error} onRetry={refreshProfile} />;

  return <Outlet />;
};

export default ProtectedRoute;
