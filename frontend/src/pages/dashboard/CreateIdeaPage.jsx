import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import { createIdea } from "../../services/ideaApi";

const CreateIdeaPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [skill, setSkill] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    domain: "",
    problemStatement: "",
    targetUsers: "",
    requiredSkills: []
  });

  const addSkill = () => {
    if (skill && !formData.requiredSkills.includes(skill)) {
      setFormData({...formData, requiredSkills: [...formData.requiredSkills, skill]});
      setSkill("");
    }
  };

  const removeSkill = (s) => {
    setFormData({...formData, requiredSkills: formData.requiredSkills.filter(i => i !== s)});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createIdea(formData);
      navigate("/app/ideas");
    } catch (err) {
      alert("Failed to create idea: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div style={{ padding: 'var(--space-lg)', maxWidth: '800px' }}>
        <h1>Create New Startup Idea</h1>
        <form onSubmit={handleSubmit}>
          <Card>
            <Input label="Title" placeholder="Idea title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
            <Input label="Description" placeholder="Detailed description (min 20 chars)" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required />
            <Input label="Category" placeholder="e.g. Fintech" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} />
            <Input label="Domain" placeholder="e.g. AI" value={formData.domain} onChange={(e) => setFormData({...formData, domain: e.target.value})} />
          </Card>
          <Card className="mar-t">
            <h3>Required Skills</h3>
            <div style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
              <Input placeholder="Enter skill" value={skill} onChange={(e) => setSkill(e.target.value)} />
              <Button type="button" onClick={addSkill}>Add</Button>
            </div>
            <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", marginBottom: "var(--space-lg)" }}>
              {formData.requiredSkills.map(s => <Badge key={s} variant="accent">{s} <button type="button" onClick={() => removeSkill(s)} style={{background:'none', border:'none', cursor:'pointer'}}>x</button></Badge>)}
            </div>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Idea"}</Button>
          </Card>
        </form>
      </div>
    </AppLayout>
  );
};

export default CreateIdeaPage;
