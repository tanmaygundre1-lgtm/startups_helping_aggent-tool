import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, FileText, Lightbulb, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import LoadingState from "../../components/common/LoadingState";
import { useAuth } from "../../hooks/useAuth";
import { getMyIdeas } from "../../services/ideaApi";

const getNextStep = (idea) => {
  if (!idea) return { label: "Capture your first idea", path: "/app/ideas/create", detail: "Start with a raw concept. We will help shape it from there." };
  const approved = idea.aiAnalysis?.isApproved || ["matching", "team-forming", "complete"].includes(idea.status);
  if (approved) return { label: "Find your teammates", path: `/app/ideas/${idea._id}/matching`, detail: "Your concept is ready for candidate matching." };
  if (idea.status === "analyzed") return { label: "Review your analysis", path: `/app/ideas/${idea._id}/analysis`, detail: "Approve the analysis to unlock team matching." };
  if (["enhanced", "analyzing"].includes(idea.status)) return { label: "Review your concept", path: `/app/ideas/${idea._id}/enhance`, detail: "Make sure the refined idea still sounds like you." };
  return { label: "Shape your idea", path: `/app/ideas/${idea._id}/enhance`, detail: "Turn your raw thought into a clear concept." };
};

const FounderDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMyIdeas()
      .then((data) => { if (active) setIdeas(data.ideas || []); })
      .catch((err) => console.error("Failed to fetch ideas", err))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const nextStep = useMemo(() => getNextStep(ideas[0]), [ideas]);
  const analyzedIdeas = ideas.filter((idea) => ["analyzed", "matching", "team-forming", "complete"].includes(idea.status));
  const readyIdeas = ideas.filter((idea) => idea.aiAnalysis?.isApproved || ["matching", "team-forming", "complete"].includes(idea.status));

  if (loading) return <LoadingState label="Loading your workspace..." />;

  return (
    <div className="page-shell dashboard-shell">
      <header className="page-header dashboard-header">
        <div><span className="eyebrow">Founder workspace</span><h1>Good to see you, {profile?.name?.split(" ")[0] || "founder"}.</h1><p>One clear next step at a time, from idea to team.</p></div>
        <Button onClick={() => navigate("/app/ideas/create")}><Lightbulb size={16} /> New idea</Button>
      </header>
      <Card className="next-step-card"><div className="next-step-icon"><ArrowRight size={20} /></div><div className="next-step-copy"><span className="eyebrow">Recommended next step</span><h2>{nextStep.label}</h2><p>{nextStep.detail}</p></div><Button onClick={() => navigate(nextStep.path)}>Continue <ArrowRight size={16} /></Button></Card>
      <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Your progress</span><h2>Build your startup</h2></div></div><div className="journey-stepper" aria-label="Startup journey progress">{["Idea", "Analysis", "Team", "Invites", "Launch"].map((step, index) => { const done = index === 0 ? ideas.length > 0 : index === 1 ? analyzedIdeas.length > 0 : index === 2 ? readyIdeas.length > 0 : false; return <div className={`journey-step ${done ? "journey-step-done" : ""}`} key={step}><span>{done ? <CheckCircle2 size={15} /> : index + 1}</span><strong>{step}</strong>{index < 4 && <i />}</div>; })}</div></section>
      <section className="stat-grid" aria-label="Workspace summary"><Card className="stat-card"><FileText size={18} /><strong>{ideas.length}</strong><span>Ideas captured</span></Card><Card className="stat-card"><CheckCircle2 size={18} /><strong>{analyzedIdeas.length}</strong><span>Analyses ready</span></Card><Card className="stat-card"><Users size={18} /><strong>{readyIdeas.length}</strong><span>Ready for teams</span></Card></section>
      <section className="dashboard-section recent-section"><div className="section-heading"><div><span className="eyebrow">Recent activity</span><h2>Your ideas</h2></div><Button variant="ghost" size="sm" onClick={() => navigate("/app/ideas")}>View all <ArrowRight size={15} /></Button></div><Card className="activity-card">{ideas.length === 0 ? <div className="empty-inline"><Lightbulb size={18} /><span>Your first idea will appear here.</span></div> : ideas.slice(0, 4).map((idea) => <button className="activity-row" key={idea._id} onClick={() => navigate(`/app/ideas/${idea._id}`)}><span className="activity-dot" /><span><strong>{idea.enhanced?.title || idea.title}</strong><small>{idea.status === "draft" ? "Draft" : "Workflow updated"}</small></span><ArrowRight size={15} /></button>)}</Card></section>
    </div>
  );
};

export default FounderDashboard;
