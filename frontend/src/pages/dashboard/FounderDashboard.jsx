import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";

const FounderDashboard = () => {
  const { profile } = useAuth();

  return (
    <div style={{ padding: "var(--space-lg)" }}>
      <h1>Welcome back, {profile?.name}</h1>
      <p style={{ color: "var(--muted)", marginBottom: "var(--space-lg)" }}>
        Build your team and bring your startup ideas to life.
      </p>

      <div
        style={{
          display: "flex",
          gap: "var(--space-md)",
          marginBottom: "var(--space-lg)",
        }}
      >
        <Button>+ Create New Idea</Button>
        <Button variant="secondary">Discover Talent</Button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--space-md)",
        }}
      >
        <Card>
          <h3>My Ideas</h3>
          <p>No startup ideas yet.</p>
          <Button variant="secondary">Create your first idea</Button>
        </Card>
        <Card>
          <h3>Team Members</h3>
          <p>—</p>
        </Card>
      </div>
    </div>
  );
};

export default FounderDashboard;
