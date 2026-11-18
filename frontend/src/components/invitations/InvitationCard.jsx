import Badge from "../common/Badge";
import Button from "../common/Button";

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getIdeaTitle = (invitation) =>
  invitation?.ideaId?.title || "Startup opportunity";
const getFounderName = (invitation) =>
  invitation?.fromFounder?.name || "Founder";
const getStatusValue = (invitation) => {
  const value = invitation?.status || "Pending";
  return String(value).trim() || "Pending";
};

const InvitationCard = ({ invitation, onViewDetails, showIdeaTitle = true }) => {
  const status = getStatusValue(invitation);
  const matchContext = invitation?.matchContext || {};
  const matchedSkills = Array.isArray(matchContext.matchedSkills)
    ? matchContext.matchedSkills.filter(Boolean)
    : [];
  const missingSkills = Array.isArray(matchContext.missingSkills)
    ? matchContext.missingSkills.filter(Boolean)
    : [];
  const score = Number.isFinite(Number(matchContext.score))
    ? Math.round(Number(matchContext.score))
    : null;

  return (
    <div className={`invitation-card${status === "Pending" ? " invitation-card-pending" : ""}`}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "var(--space-md)",
          flexWrap: "wrap",
          marginBottom: "var(--space-sm)",
        }}
      >
        <div>
          <div
            style={{
              color: "var(--muted)",
              fontSize: "0.8rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {invitation?.ideaId?.domain || "Startup"}
          </div>
          {showIdeaTitle && <h3 className="invitation-card-title">{getIdeaTitle(invitation)}</h3>}
        </div>
        <Badge variant={status === "Pending" ? "accent" : "neutral"}>
          {status}
        </Badge>
      </div>

      <div className="invitation-meta">
        <strong>Founder:</strong> {getFounderName(invitation)}
      </div>

      <div className="invitation-role">
        <strong>Role:</strong> {invitation?.role || "Role unspecified"}
      </div>

      <p className="invitation-message">
        {invitation?.message || "No message added."}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-sm)",
          marginBottom: "var(--space-md)",
        }}
      >
        {score !== null && <Badge variant="accent">Match {score}%</Badge>}
        {matchedSkills.slice(0, 3).map((skill) => (
          <Badge key={skill}>{skill}</Badge>
        ))}
      </div>

      {missingSkills.length > 0 && (
        <div style={{ color: "var(--muted)", marginBottom: "var(--space-md)" }}>
          <strong>Missing skills:</strong> {missingSkills.join(", ")}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-sm)",
          borderTop: "1px solid var(--line)",
          paddingTop: "var(--space-md)",
        }}
      >
        <span className="invitation-date">
          Received: {formatDate(invitation?.createdAt)}
        </span>
        <Button variant="secondary" size="sm" onClick={() => onViewDetails(invitation)}>
          View details
        </Button>
      </div>
    </div>
  );
};

export default InvitationCard;
