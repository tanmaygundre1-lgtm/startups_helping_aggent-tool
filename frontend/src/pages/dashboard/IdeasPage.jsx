import { useEffect, useState } from "react";
import { ArrowRight, Ellipsis, FileText, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import LoadingState from "../../components/common/LoadingState";
import { getMyIdeas, deleteIdea } from "../../services/ideaApi";

const getIdeaState = (status, isApproved) => {
  if (isApproved || ["matching", "team-forming", "complete"].includes(status)) return { label: "Finding teammates", variant: "success" };
  if (status === "analyzed") return { label: "Analysis ready", variant: "accent" };
  if (status === "enhanced") return { label: "Concept ready", variant: "accent" };
  if (["enhancing", "analyzing"].includes(status)) return { label: "In progress", variant: "warning" };
  return { label: "Draft", variant: "neutral" };
};

const getNextAction = (idea, isApproved) => {
  if (isApproved) return { label: "Generate team", path: `/app/ideas/${idea._id}/matching` };
  if (idea.status === "analyzed") return { label: "Review analysis", path: `/app/ideas/${idea._id}/analysis` };
  if (idea.status === "enhanced") return { label: "Review concept", path: `/app/ideas/${idea._id}/enhance` };
  return { label: "Shape idea", path: `/app/ideas/${idea._id}/enhance` };
};

const IdeasPage = () => {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    getMyIdeas()
      .then((data) => { if (active) setIdeas(data.ideas || []); })
      .catch((err) => console.error("Failed to fetch ideas", err))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteIdea(deleteTarget.id);
      setIdeas((current) => current.filter((idea) => idea._id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      alert(err.message || "Failed to delete idea");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <AppLayout><LoadingState label="Loading your ideas..." /></AppLayout>;

  return (
    <AppLayout>
      <div className="page-shell ideas-shell">
        <header className="page-header">
          <div><span className="eyebrow">Founder workspace</span><h1>My ideas</h1><p>Keep each concept moving toward the right next step.</p></div>
          <Button onClick={() => navigate("/app/ideas/create")}><FileText size={16} /> New idea</Button>
        </header>
        {ideas.length === 0 ? (
          <Card className="empty-state"><div className="empty-state-icon"><FileText size={22} /></div><h2>No ideas yet</h2><p>Capture a raw thought and let idiaMate help you shape it.</p><Button onClick={() => navigate("/app/ideas/create")}>Capture an idea <ArrowRight size={16} /></Button></Card>
        ) : (
          <div className="idea-list">
            {ideas.map((idea) => {
              const approved = idea.aiAnalysis?.isApproved === true || idea.status === "matching";
              const status = getIdeaState(idea.status, approved);
              const action = getNextAction(idea, approved);
              const score = idea.aiAnalysis?.scoring?.overallScore;
              const title = idea.enhanced?.title || idea.title;
              return <Card className="idea-card" key={idea._id}>
                <div className="idea-card-top"><div className="idea-card-title"><div className="badge-row"><Badge variant={status.variant}>{status.label}</Badge>{idea.domain && <Badge>{idea.domain}</Badge>}</div><button className="text-button idea-title-button" onClick={() => navigate(`/app/ideas/${idea._id}`)}>{title}</button><p>{idea.enhanced?.description || idea.description}</p></div><details className="idea-menu"><summary aria-label={`More actions for ${title}`}><Ellipsis size={18} /></summary><div className="idea-menu-popover"><button onClick={() => navigate(`/app/ideas/${idea._id}`)}>View overview</button>{!approved && <button className="menu-danger" onClick={() => setDeleteTarget({ id: idea._id, title })}><Trash2 size={14} /> Delete idea</button>}</div></details></div>
                <div className="idea-card-bottom"><div className="idea-score">{score !== undefined ? <><span className="idea-score-label">Analysis score <span title="Score combines problem strength, market potential, feasibility, differentiation, and execution readiness">ⓘ</span></span><div className="score-track"><span style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></div><strong>{Math.round(score)}/100</strong></> : <span className="idea-score-label">Analysis starts after your concept is ready</span>}</div><Button onClick={() => navigate(action.path)}>{action.label} <ArrowRight size={15} /></Button></div>
              </Card>;
            })}
          </div>
        )}
      </div>
      {deleteTarget && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><button className="modal-close" aria-label="Close delete dialog" onClick={() => setDeleteTarget(null)}><X size={18} /></button><div className="state-icon state-icon-error"><Trash2 size={19} /></div><h2 id="delete-title">Delete this idea?</h2><p>“{deleteTarget.title}” will be removed. This cannot be undone.</p><div className="modal-actions"><Button variant="secondary" onClick={() => setDeleteTarget(null)}>Keep idea</Button><Button variant="danger" loading={deleting} onClick={confirmDelete}>Delete idea</Button></div></section></div>}
    </AppLayout>
  );
};
export default IdeasPage;
