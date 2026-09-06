import { useAuth } from "../hooks/useAuth";
import AppLayout from "../components/layout/AppLayout";
import FounderDashboard from "./dashboard/FounderDashboard";
import CandidateDashboard from "./dashboard/CandidateDashboard";

const ApplicationEntryPage = () => {
  const { profileType } = useAuth();

  return (
    <AppLayout>
      {profileType === "founder" ? (
        <FounderDashboard />
      ) : (
        <CandidateDashboard />
      )}
    </AppLayout>
  );
};

export default ApplicationEntryPage;
