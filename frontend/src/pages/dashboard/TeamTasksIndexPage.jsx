import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import { listTeams } from "../../services/matchingApi";

const TeamTasksIndexPage = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await listTeams();
      setTeams(response?.teams || []);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load your teams.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  return (
    <AppLayout>
      <main className="page-shell task-workspace">
        <header className="page-header">
          <div>
            <span className="eyebrow">Workspace</span>
            <h1>Tasks</h1>
            <p>Choose a team to manage or review its tasks.</p>
          </div>
        </header>
        {loading && <Card><p role="status">Loading your teams…</p></Card>}
        {!loading && error && (
          <Card>
            <p className="task-message task-message-error" role="alert">{error}</p>
            <Button onClick={() => void loadTeams()}>Try again</Button>
          </Card>
        )}
        {!loading && !error && teams.length === 0 && (
          <Card className="empty-state">
            <h2>No teams yet</h2>
            <p>Teams you belong to will appear here when you’re ready to manage tasks.</p>
          </Card>
        )}
        {!loading && !error && teams.length > 0 && (
          <section className="team-grid" aria-label="Teams">
            {teams.map((team) => (
              <Card key={team._id}>
                <span className="eyebrow">Team</span>
                <h2>{team.name || "Startup team"}</h2>
                <p>{team.members?.length || 0} team members</p>
                <Link className="button button-primary" to={`/app/teams/${team._id}/tasks`}>
                  Open tasks
                </Link>
              </Card>
            ))}
          </section>
        )}
      </main>
    </AppLayout>
  );
};

export default TeamTasksIndexPage;
