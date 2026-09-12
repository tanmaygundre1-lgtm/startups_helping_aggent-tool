import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import { analyzeIdea } from "../../services/ideaApi";

const AnalyzeIdeaPage = () => {
  const { ideaId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadAnalysis = async () => {
      if (!isMounted) return;
      setLoading(true);
      try {
        const data = await analyzeIdea(ideaId);
        if (isMounted) setAnalysis(data.analysis);
      } catch (err) {
        if (isMounted)
          setError(err.message || "Analysis failed. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAnalysis();

    return () => {
      isMounted = false;
    };
  }, [ideaId]);

  if (loading) {
    return (
      <AppLayout>
        <div
          style={{
            padding: "var(--space-lg)",
            maxWidth: "1000px",
            textAlign: "center",
          }}
        >
          <p>Analyzing your idea...</p>
        </div>
      </AppLayout>
    );
  }

  if (error && !analysis) {
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
            <p style={{ color: "var(--danger)" }}>Analysis failed: {error}</p>
            <Button variant="secondary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!analysis) {
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

  const {
    scoring,
    evidence,
    rolesAndSkills,
    techStack,
    keyRequirements,
    nextSteps,
  } = analysis;

  return (
    <AppLayout>
      <div style={{ padding: "var(--space-lg)", maxWidth: "1000px" }}>
        <header style={{ marginBottom: "var(--space-lg)" }}>
          <h1>Critical Analysis</h1>
          <p style={{ color: "var(--muted)" }}>
            This is a critical evaluation, not a marketing score. Scores are
            calculated deterministically from structured AI evidence.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: "var(--space-lg)",
          }}
        >
          <div>
            <Card>
              <h2>Overall Assessment</h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-lg)",
                  marginBottom: "var(--space-lg)",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "3rem",
                      fontWeight: 700,
                      color: "var(--accent)",
                    }}
                  >
                    {scoring?.overallScore} / 100
                  </div>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 600,
                      color: "var(--accent)",
                    }}
                  >
                    {scoring?.verdict}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                    <strong>How this works:</strong> Scores are calculated
                    deterministically from structured AI evidence using the
                    application's scoring model. These are decision-support
                    signals, not guaranteed business outcomes.
                  </p>
                </div>
              </div>

              <h3>Score Breakdown</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "var(--space-md)",
                }}
              >
                {scoring?.breakdown &&
                  Object.entries(scoring.breakdown).map(([key, value]) => (
                    <Card key={key} style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: 700,
                          color: "var(--ink)",
                        }}
                      >
                        {value}
                      </div>
                      <div
                        style={{ color: "var(--muted)", fontSize: "0.9rem" }}
                      >
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                    </Card>
                  ))}
              </div>
            </Card>

            <Card className="mar-t">
              <h3>Required Team Skills</h3>
              <div style={{ display: "grid", gap: "var(--space-md)" }}>
                {rolesAndSkills?.map((role, idx) => (
                  <Card key={idx} style={{ padding: "var(--space-md)" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "var(--space-sm)",
                      }}
                    >
                      <h4 style={{ margin: 0 }}>{role.role}</h4>
                      <Badge
                        variant={role.priority === "must-have" ? "accent" : ""}
                      >
                        {role.priority}
                      </Badge>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "var(--space-xs)",
                        marginBottom: "var(--space-sm)",
                      }}
                    >
                      {(role.skills || []).map((s, i) => (
                        <Badge key={i} style={{ fontSize: "0.8rem" }}>
                          {s}
                        </Badge>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "var(--space-md)",
                        fontSize: "0.85rem",
                        color: "var(--muted)",
                      }}
                    >
                      <span>Experience: {role.experienceLevel}</span>
                      <span>Count: {role.count}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            <Card className="mar-t">
              <h3>Important Limitations</h3>
              <ul style={{ margin: 0, paddingLeft: "var(--space-lg)" }}>
                <li>AI analysis is based on the information provided.</li>
                <li>
                  Differentiation assessment is not proof of market uniqueness.
                </li>
                <li>Market assumptions should be independently validated.</li>
                <li>
                  Scores are decision-support signals, not guaranteed business
                  outcomes.
                </li>
              </ul>
            </Card>

            <Card className="mar-t">
              <h3>Risks & Limitations</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--space-md)",
                }}
              >
                <div>
                  <h4>Risks</h4>
                  <ul style={{ margin: 0, paddingLeft: "var(--space-lg)" }}>
                    {evidence?.limits?.risks?.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Limitations</h4>
                  <ul style={{ margin: 0, paddingLeft: "var(--space-lg)" }}>
                    {evidence?.limits?.limitations?.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="mar-t">
              <h3>Recommended Next Steps</h3>
              <ul style={{ margin: 0, paddingLeft: "var(--space-lg)" }}>
                {nextSteps?.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </Card>
          </div>

          <aside>
            <Card>
              <h3>Key Requirements</h3>
              <ul style={{ margin: 0, paddingLeft: "var(--space-lg)" }}>
                {keyRequirements?.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </Card>

            <Card className="mar-t">
              <h3>Tech Stack</h3>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--space-xs)",
                }}
              >
                {(techStack || []).map((t, i) => (
                  <Badge key={i}>{t}</Badge>
                ))}
              </div>
            </Card>
          </aside>
        </div>

        <div
          style={{
            display: "flex",
            gap: "var(--space-md)",
            marginTop: "var(--space-lg)",
            justifyContent: "flex-end",
          }}
        >
          <Button
            variant="secondary"
            type="button"
            onClick={() => window.history.back()}
          >
            Edit Idea
          </Button>
          <Button
            onClick={async () => {
              try {
                const res = await fetch(`/api/ideas/${ideaId}/analysis`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ approve: true }),
                });
                if (res.ok) {
                  window.location.reload();
                }
              } catch {
                alert("Failed to approve");
              }
            }}
          >
            Approve Idea & Continue
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default AnalyzeIdeaPage;
