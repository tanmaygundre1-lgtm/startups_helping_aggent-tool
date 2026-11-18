import { useCallback, useEffect, useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import InvitationCard from "../../components/invitations/InvitationCard";
import InvitationDetailsModal from "../../components/invitations/InvitationDetailsModal";
import { useAuth } from "../../hooks/useAuth";
import { listInvitations } from "../../services/matchingApi";

const FILTER_OPTIONS = ["Pending", "Accepted", "Declined", "Withdrawn", "All"];

const normalizeInvitationsResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.invitations)) return payload.invitations;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

const groupByIdea = (items) => Object.values(items.reduce((groups, invitation) => {
  const key = invitation?.ideaId?._id || invitation?.ideaId || "unknown";
  if (!groups[key]) groups[key] = { title: invitation?.ideaId?.title || "Startup opportunity", invitations: [] };
  groups[key].invitations.push(invitation);
  return groups;
}, {}));

const CandidateInvitationsPage = () => {
  const { profileType } = useAuth();
  const direction = profileType === "founder" ? "sent" : "received";
  const [filter, setFilter] = useState("All");
  const [invitations, setInvitations] = useState([]);
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await listInvitations(
        direction,
        filter === "All" ? "" : filter,
      );
      const nextInvitations = normalizeInvitationsResponse(response)
        .filter((invitation) => filter !== "All" || invitation?.status !== "Withdrawn")
        .sort(
        (a, b) => {
          const aTime = new Date(a?.createdAt || 0).getTime();
          const bTime = new Date(b?.createdAt || 0).getTime();
          return bTime - aTime;
        },
      );
      setInvitations(nextInvitations);
    } catch (err) {
      const status = err?.status || err?.response?.status;
      if (status === 401) {
        setError("Your session has expired. Please sign in again.");
      } else {
        setError("Unable to load invitations.");
      }
    } finally {
      setLoading(false);
    }
  }, [direction, filter]);

  useEffect(() => {
    let active = true;

    const loadInvitations = async () => {
      if (!active) return;
      await fetchInvitations();
    };

    void loadInvitations();

    return () => {
      active = false;
    };
  }, [fetchInvitations]);

  const renderLoadingState = () => (
    <div style={{ display: "grid", gap: "var(--space-md)" }}>
      {[1, 2, 3].map((key) => (
        <div
          key={key}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)",
            height: "220px",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );

  const handleStatusChange = useCallback(
    (updatedInvitation) => {
      if (!updatedInvitation) {
        void fetchInvitations();
        return;
      }

      setSelectedInvitation((current) => {
        if (!current || current?._id !== updatedInvitation?._id) {
          return current;
        }

        return {
          ...current,
          ...updatedInvitation,
          status: updatedInvitation.status || current.status,
        };
      });
      void fetchInvitations();
    },
    [fetchInvitations],
  );

  const renderEmptyState = () => (
    <Card>
      <h3 style={{ marginTop: 0 }}>No invitations yet</h3>
      <p style={{ marginBottom: 0 }}>
        {profileType === "founder"
          ? "Your sent invitations will appear here once you start reaching out to candidates."
          : "Startup founders can invite you to join their project when your skills match their requirements."}
      </p>
    </Card>
  );

  const renderErrorState = () => (
    <Card>
      <h3 style={{ marginTop: 0 }}>Unable to load invitations</h3>
      <p>{error}</p>
      <Button onClick={fetchInvitations}>Retry</Button>
    </Card>
  );

  return (
    <AppLayout>
      <div className="page-shell invitations-page">
        <header className="page-header"><div><span className="eyebrow">Collaboration</span><h1>Invitations</h1><p>
            {profileType === "founder"
              ? "Review the invitations you have sent to candidates."
              : "Review opportunities from founders who are interested in your skills."}
          </p></div></header>

        {!error && (
          <div className="filter-tabs" role="tablist" aria-label="Invitation status">
            {FILTER_OPTIONS.map((option) => {
              const active = option === filter;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`filter-tab${active ? " filter-tab-active" : ""}`}
                  aria-pressed={active}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {loading && renderLoadingState()}
        {!loading && error && renderErrorState()}
        {!loading && !error && invitations.length === 0 && renderEmptyState()}

        {!loading && !error && invitations.length > 0 && (
          <div className="invitation-groups">
            {groupByIdea(invitations).map((group) => <section className="invitation-group" key={group.title}><div className="invitation-group-heading"><h2>{group.title}</h2><span>{group.invitations.length} {group.invitations.length === 1 ? "invitation" : "invitations"}</span></div><div className="invitation-grid">{group.invitations.map((invitation) => <InvitationCard key={invitation?._id || invitation?.id} invitation={invitation} showIdeaTitle={false} onViewDetails={setSelectedInvitation} />)}</div></section>)}
          </div>
        )}
      </div>

      <InvitationDetailsModal
        invitation={selectedInvitation}
        onClose={() => setSelectedInvitation(null)}
        onStatusChange={handleStatusChange}
      />
    </AppLayout>
  );
};

export default CandidateInvitationsPage;
