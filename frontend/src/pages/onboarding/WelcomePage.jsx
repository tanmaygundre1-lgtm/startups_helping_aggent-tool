import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Button from "../../components/common/Button";

const WelcomePage = () => {
  const { backendUser, logout } = useAuth();

  return (
    <main className="state-page">
      <div className="state-panel">
        <span className="state-kicker">One more step</span>
        <h1>Welcome{backendUser?.name ? `, ${backendUser.name}` : ""}.</h1>
        <p>
          Your account is connected. Onboarding will be added in the next phase.
        </p>
        <div className="action-row">
          <Link className="primary-button" to="/onboarding/role">
            Get Started
          </Link>
          <Button variant="secondary" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
    </main>
  );
};

export default WelcomePage;
