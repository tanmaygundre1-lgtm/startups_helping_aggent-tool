import { ArrowRight, Compass, Sparkles, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { useAuth } from "../../hooks/useAuth";

const CandidateDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const skills = profile?.skills || [];

  return (
    <div className="page-shell dashboard-shell">
      <header className="page-header dashboard-header">
        <div><span className="eyebrow">Candidate workspace</span><h1>Welcome back, {profile?.name?.split(" ")[0] || "builder"}.</h1><p>Find a startup where your skills can make an impact.</p></div>
        <Button onClick={() => navigate("/app/explore")}><Compass size={16} /> Explore startups</Button>
      </header>
      <Card className="next-step-card"><div className="next-step-icon"><Sparkles size={20} /></div><div className="next-step-copy"><span className="eyebrow">Your next step</span><h2>Explore ideas that fit you</h2><p>Browse founder ideas and find a project that matches your interests.</p></div><Button onClick={() => navigate("/app/explore")}>Explore <ArrowRight size={16} /></Button></Card>
      <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Your profile</span><h2>What you bring</h2></div><Button variant="ghost" size="sm" onClick={() => navigate("/onboarding/candidate")}>Edit profile</Button></div><Card className="profile-summary-card"><div className="profile-summary-icon"><UserRound size={20} /></div><div><strong>{profile?.targetRoles?.join(" · ") || "Add your target roles"}</strong><p>{skills.length ? "Your skills are ready to match against founder ideas." : "Add skills to improve your recommendations."}</p><div className="badge-row">{skills.slice(0, 6).map((skill) => <Badge key={skill.name}>{skill.name}</Badge>)}</div></div></Card></section>
    </div>
  );
};

export default CandidateDashboard;
