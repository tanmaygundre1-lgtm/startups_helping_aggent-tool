import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Card from "../../components/common/Card";
import { enhanceIdea } from "../../services/ideaApi";

const EnhanceIdeaPage = () => {
  const { ideaId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [enhanced, setEnhanced] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadEnhanced = async () => {
      if (!ideaId || enhanced) return;
      setLoading(true);
      try {
        const data = await enhanceIdea(ideaId);
        if (isMounted) setEnhanced(data.enhancedIdea);
      } catch (err) {
        if (isMounted)
          setError(err.message || "Enhancement failed. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadEnhanced();

    return () => {
      isMounted = false;
    };
  }, [ideaId, enhanced]);

  const updateField = (field, value) => {
    setEnhanced((current) => ({
      ...current,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <AppLayout>
        <div
          style={{
            padding: "var(--space-lg)",
            maxWidth: "800px",
            textAlign: "center",
          }}
        >
          <p>Clarifying your idea...</p>
        </div>
      </AppLayout>
    );
  }

  if (error && !enhanced) {
    return (
      <AppLayout>
        <div
          style={{
            padding: "var(--space-lg)",
            maxWidth: "700px",
            textAlign: "center",
          }}
        >
          <Card style={{ borderColor: "var(--danger)" }}>
            <p style={{ color: "var(--danger)" }}>
              Enhancement failed: {error}
            </p>
            <Button variant="secondary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!enhanced) {
    return (
      <AppLayout>
        <div
          style={{
            padding: "var(--space-lg)",
            maxWidth: "800px",
            textAlign: "center",
          }}
        >
          <p>Loading...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ padding: "var(--space-lg)", maxWidth: "800px" }}>
        <h1>Review Your Enhanced Idea</h1>
        <p style={{ color: "var(--muted)", marginBottom: "var(--space-lg)" }}>
          Review and edit the enhanced concept. You can make changes before
          proceeding to analysis.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/app/ideas/${ideaId}/analysis`);
          }}
        >
          <Card>
            <Input
              label="Enhanced Title"
              value={enhanced.title || ""}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Enhanced title will appear here"
            />
            <Input
              label="Refined Description"
              value={enhanced.description || ""}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Refined description"
            />
            <Input
              label="Problem"
              value={enhanced.problem || ""}
              onChange={(event) => updateField("problem", event.target.value)}
              placeholder="Problem statement"
            />
            <Input
              label="Solution"
              value={enhanced.solution || ""}
              onChange={(event) => updateField("solution", event.target.value)}
              placeholder="Solution explanation"
            />
            <Input
              label="Target Audience"
              value={enhanced.targetAudience || ""}
              onChange={(event) =>
                updateField("targetAudience", event.target.value)
              }
              placeholder="Primary audience"
            />
            <Input
              label="Value Proposition"
              value={enhanced.valueProposition || ""}
              onChange={(event) =>
                updateField("valueProposition", event.target.value)
              }
              placeholder="Why this is valuable"
            />
            <Input
              label="Core Workflow"
              value={enhanced.coreWorkflow || ""}
              onChange={(event) =>
                updateField("coreWorkflow", event.target.value)
              }
              placeholder="How it works"
            />
          </Card>
          <div
            style={{
              display: "flex",
              gap: "var(--space-md)",
              marginTop: "var(--space-lg)",
            }}
          >
            <Button
              variant="secondary"
              type="button"
              onClick={() => window.history.back()}
            >
              Back
            </Button>
            <Button variant="secondary" type="button">
              Save Changes
            </Button>
            <Button type="submit" style={{ flex: 1 }}>
              Go with this Idea
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default EnhanceIdeaPage;
