import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { useAuth } from "../../hooks/useAuth";

const CandidateDashboard = () => {
  const { profile } = useAuth();

  return (
    <div style={{ padding: "var(--space-lg)" }}>
      <h1>Welcome back, {profile?.name}</h1>
      <p style={{ color: "var(--muted)", marginBottom: "var(--space-lg)" }}>
        Discover startups where your skills can make an impact.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--space-md)",
        }}
      >
        <Card>
          <h3>Profile Summary</h3>
          <div style={{ marginBottom: "var(--space-sm)" }}>
            <strong>Roles:</strong> {profile?.targetRoles?.join(", ") || "None"}
          </div>
          <div>
            <strong>Skills:</strong>{" "}
            {profile?.skills?.map((s) => (
              <Badge key={s.name}>{s.name}</Badge>
            )) || "None"}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: "var(--space-lg)" }}>
        <h2>Recommended</h2>
        <Card>
          <p>Your startup journey starts here.</p>
          <Button>Explore Startups</Button>
        </Card>
      </div>
    </div>
  );
};

export default CandidateDashboard;
