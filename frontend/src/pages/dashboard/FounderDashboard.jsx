import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import { getMyIdeas } from "../../services/ideaApi";

const FounderDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIdeas = async () => {
      try {
        const data = await getMyIdeas();
        setIdeas(data.ideas);
      } catch (err) {
        console.error("Failed to fetch ideas", err);
      } finally {
        setLoading(false);
      }
    };
    fetchIdeas();
  }, []);

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
        <Button onClick={() => navigate("/app/ideas/create")}>
          + Create New Idea
        </Button>
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
          <h3>My Ideas ({ideas.length})</h3>
          {loading ? (
            <p>Loading ideas...</p>
          ) : ideas.length === 0 ? (
            <>
              <p>You haven't created a startup idea yet.</p>
              <Button
                style={{ marginTop: "var(--space-sm)" }}
                variant="secondary"
                onClick={() => navigate("/app/ideas/create")}
              >
                Create your first idea
              </Button>
            </>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {ideas.slice(0, 3).map((idea) => (
                <li key={idea._id} style={{ marginBottom: "var(--space-sm)" }}>
                  <a
                    href={`/app/ideas/${idea._id}`}
                    style={{
                      textDecoration: "none",
                      color: "var(--ink)",
                      fontWeight: 600,
                    }}
                  >
                    {idea.title}
                  </a>
                  <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    {idea.category} • {idea.status}
                  </p>
                </li>
              ))}
              {ideas.length > 3 && (
                <Button variant="ghost" onClick={() => navigate("/app/ideas")}>
                  View all
                </Button>
              )}
            </ul>
          )}
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
