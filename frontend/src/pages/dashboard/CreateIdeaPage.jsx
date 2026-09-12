import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Card from "../../components/common/Card";
import { createIdea } from "../../services/ideaApi";

const CreateIdeaPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await createIdea({
        title: formData.title,
        description: formData.description,
      });
      if (data.idea?._id) {
        navigate(`/app/ideas/${data.idea._id}/enhance`);
      } else {
        navigate("/app/ideas");
      }
    } catch (err) {
      alert("Failed to create idea: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div style={{ padding: "var(--space-lg)", maxWidth: "700px" }}>
        <h1>Create Your Startup Idea</h1>
        <p style={{ color: "var(--muted)", marginBottom: "var(--space-lg)" }}>
          Have a rough idea? We'll help turn it into a clearer startup concept
          before evaluating it.
        </p>
        <form onSubmit={handleSubmit}>
          <Card>
            <Input
              label="Idea Title"
              placeholder="e.g., A marketplace for student tutors"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
            <Input
              label="Idea Description"
              placeholder="Describe your idea in a few sentences..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
          </Card>
          <div
            style={{
              display: "flex",
              gap: "var(--space-md)",
              marginTop: "var(--space-lg)",
            }}
          >
            <Button type="submit" disabled={loading} style={{ flex: 1 }}>
              {loading ? "Creating..." : "✨ Enhance My Idea"}
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default CreateIdeaPage;
