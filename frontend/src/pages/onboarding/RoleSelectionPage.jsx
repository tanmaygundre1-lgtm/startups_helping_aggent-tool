import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, Rocket } from "lucide-react";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";

const RoleSelectionPage = () => {
  const navigate = useNavigate();

  return (
    <main className="state-page">
      <div className="state-panel">
        <span className="state-kicker">Choose your path</span>
        <h1>How will you build today?</h1>

        <div className="role-choice-list">
          <Card className="role-choice-card">
            <div className="role-choice-icon"><Rocket size={20} /></div><h3>I have a startup idea</h3>
            <p>
              I'm looking for talented people to help build my startup.
            </p>
            <Button onClick={() => navigate("/onboarding/founder")}>
              I am a Founder
            </Button>
          </Card>

          <Card className="role-choice-card">
            <div className="role-choice-icon"><BriefcaseBusiness size={20} /></div><h3>I want to join a startup</h3>
            <p>
              I want to use my skills and work with exciting startup ideas.
            </p>
            <Button onClick={() => navigate("/onboarding/candidate")}>
              I am a Candidate
            </Button>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default RoleSelectionPage;
