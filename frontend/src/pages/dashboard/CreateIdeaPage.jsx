import { useState, useEffect } from "react";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Card from "../../components/common/Card";
import { createIdea, updateIdea, getIdeaById } from "../../services/ideaApi";

const CreateIdeaPage = () => {
  const { ideaId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(Boolean(ideaId));
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [creationRequestId] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const isEditMode = Boolean(ideaId);

  useEffect(() => {
    let isMounted = true;
    if (ideaId) {
      getIdeaById(ideaId)
        .then((data) => {
          if (!isMounted) return;
          const idea = data.idea || data;
          if (idea) {
            setFormData({
              title: idea.original?.title || idea.title || "",
              description: idea.original?.description || idea.description || "",
            });
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setError(err.message || "Failed to load idea details");
        })
        .finally(() => {
          if (isMounted) setFetching(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [ideaId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }
    if (
      !formData.description.trim() ||
      formData.description.trim().length < 20
    ) {
      setError("Description must be at least 20 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (isEditMode) {
        await updateIdea(ideaId, {
          title: formData.title.trim(),
          description: formData.description.trim(),
        });
        navigate(`/app/ideas/${ideaId}/enhance`);
      } else {
        const data = await createIdea(
          {
            title: formData.title.trim(),
            description: formData.description.trim(),
          },
          creationRequestId,
        );
        if (data.idea?._id) {
          navigate(`/app/ideas/${data.idea._id}/enhance`);
        } else {
          navigate("/app/ideas");
        }
      }
    } catch (err) {
      setError(err.message || "Failed to save idea. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      setError("Title must be at least 3 characters to save draft.");
      return;
    }
    if (
      !formData.description.trim() ||
      formData.description.trim().length < 20
    ) {
      setError("Description must be at least 20 characters to save draft.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (isEditMode) {
        await updateIdea(ideaId, {
          title: formData.title.trim(),
          description: formData.description.trim(),
        });
        setSuccessMsg("Draft saved successfully!");
      } else {
        const data = await createIdea(
          {
            title: formData.title.trim(),
            description: formData.description.trim(),
          },
          creationRequestId,
        );
        if (data.idea?._id) {
          setSuccessMsg("Draft saved successfully!");
          navigate(`/app/ideas/${data.idea._id}/raw`, { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || "Failed to save draft.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <AppLayout>
        <div className="page-shell form-shell"><p>Loading your idea...</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-shell form-shell">
        <div className="form-progress" aria-label="Idea creation progress"><span className="form-progress-active"><b><Check size={13} /></b><small>Capture</small></span><i /><span><b>2</b><small>Refine</small></span><i /><span><b>3</b><small>Analyze</small></span></div>
        <div className="form-intro">
          <span className="eyebrow">Step 1 of 3</span>
          <h1>{isEditMode ? "Edit your idea" : "Capture your idea"}</h1>
          <p>Start with the problem you want to solve. You can refine the details with AI next.</p>
        </div>

        {error && (
          <Card
            style={{
              borderColor: "var(--danger)",
              marginBottom: "var(--space-md)",
            }}
          >
              <p className="form-alert form-alert-error">{error}</p>
          </Card>
        )}

        {successMsg && (
          <Card
            style={{
              borderColor: "var(--accent)",
              marginBottom: "var(--space-md)",
            }}
          >
            <p className="form-alert form-alert-success">
              ✓ {successMsg}
            </p>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <Input
              label="Startup Idea Title"
              hint="A short name that makes the idea easy to remember."
              placeholder="e.g., CampusConnect: Peer Tutoring & Skills Marketplace"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
            <div className="field">
              <label className="field-label" htmlFor="idea-description">Idea pitch</label>
              <textarea
                id="idea-description"
                placeholder="Describe the problem, solution, and target student audience in detail (minimum 20 characters)..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                rows={6}
                className="input idea-description-input"
              />
              <span className="field-hint">
                {formData.description.length} characters (min 20)
              </span>
            </div>
            <div className="privacy-note"><LockKeyhole size={15} /><span>Only people you invite can see your idea.</span></div>
          </Card>

          <div className="form-actions">
            <Button
              variant="ghost"
              type="button"
              onClick={() => navigate("/app/ideas")}
            >
              Back to ideas
            </Button>

            <div className="form-action-group">
              <Button
                variant="secondary"
                type="button"
                disabled={loading}
                onClick={handleSaveDraft}
              >
                Save draft
              </Button>

              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : isEditMode
                    ? <>Save & review <ArrowRight size={15} /></>
                    : <>Save & enhance <ArrowRight size={15} /></>}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default CreateIdeaPage;
