import { useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";

const RoleSelectionPage = () => {
  const navigate = useNavigate();

  return (
    <main className="state-page">
      <div className="state-panel">
        <span className="state-kicker">Get Started</span>
        <h1>What brings you to StartupLink?</h1>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", marginTop: "var(--space-lg)" }}>
          <Card>
            <h3>🚀 I Have a Startup Idea</h3>
            <p style={{ marginBottom: "var(--space-md)" }}>I'm looking for talented people to help build my startup.</p>
            <Button onClick={() => navigate("/onboarding/founder")}>I am a Founder</Button>
          </Card>

          <Card>
            <h3>💻 I Want to Join a Startup</h3>
            <p style={{ marginBottom: "var(--space-md)" }}>I want to use my skills and work with exciting startup ideas.</p>
            <Button onClick={() => navigate("/onboarding/candidate")}>I am a Candidate</Button>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default RoleSelectionPage;
