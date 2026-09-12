import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { getMyIdeas, deleteIdea } from "../../services/ideaApi";

const IdeasPage = () => {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    const fetchIdeas = async () => {
      setLoading(true);
      try {
        const data = await getMyIdeas();
        if (isActive) setIdeas(data.ideas);
      } catch (err) {
        console.error("Failed to fetch ideas", err);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchIdeas();

    return () => {
      isActive = false;
    };
  }, []);

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this idea?")) {
      await deleteIdea(id);
      setIdeas((currentIdeas) =>
        currentIdeas.filter((idea) => idea._id !== id),
      );
    }
  };

  return (
    <AppLayout>
      <div style={{ padding: "var(--space-lg)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "var(--space-md)",
          }}
        >
          <h1>My Startup Ideas</h1>
          <Button onClick={() => navigate("/app/ideas/create")}>
            + Create Idea
          </Button>
        </div>
        {loading ? (
          <p>Loading ideas...</p>
        ) : ideas.length === 0 ? (
          <Card>
            <p>You haven't created a startup idea yet.</p>
            <Button onClick={() => navigate("/app/ideas/create")}>
              Create your first idea
            </Button>
          </Card>
        ) : (
          <div style={{ display: "grid", gap: "var(--space-md)" }}>
            {ideas.map((idea) => (
              <Card key={idea._id}>
                <h3>{idea.title}</h3>
                <p>{idea.description}</p>
                <div
                  style={{
                    display: "flex",
                    gap: "var(--space-sm)",
                    margin: "var(--space-sm) 0",
                  }}
                >
                  <Badge>{idea.category}</Badge>
                  <Badge>{idea.domain}</Badge>
                  <Badge variant="accent">{idea.status}</Badge>
                </div>
                <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/app/ideas/${idea._id}`)}
                  >
                    View Idea
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleDelete(idea._id)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default IdeasPage;
