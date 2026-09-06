import { useAuth } from "../hooks/useAuth";

const ApplicationEntryPage = () => {
  const { backendUser, logout } = useAuth();

  return (
    <main className="state-page">
      <div className="state-panel">
        <span className="state-kicker">Application ready</span>
        <h1>Welcome back{backendUser?.name ? `, ${backendUser.name}` : ""}.</h1>
        <p>
          Your authenticated application area is ready for the next product
          phase.
        </p>
        <button className="secondary-button" type="button" onClick={logout}>
          Sign out
        </button>
      </div>
    </main>
  );
};

export default ApplicationEntryPage;
