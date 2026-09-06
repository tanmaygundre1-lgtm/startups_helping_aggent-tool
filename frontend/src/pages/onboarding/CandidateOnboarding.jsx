import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { updateProfile } from "../../api/userApi";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";

const CandidateOnboarding = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [skillInput, setSkillInput] = useState({
    name: "",
    level: "Intermediate",
  });
  const [formData, setFormData] = useState({
    targetRoles: [],
    skills: [],
    availability: "full-time",
  });

  const addSkill = () => {
    if (skillInput.name) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput] });
      setSkillInput({ name: "", level: "Intermediate" });
    }
  };

  const removeSkill = (index) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateProfile({ ...formData, profileType: "candidate" });
      await refreshProfile();
      navigate("/app");
    } catch (err) {
      alert("Failed to save profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="state-page">
      <Card className="state-panel">
        <span className="state-kicker">
          Candidate Profile — Step {step} of 2
        </span>
        {step === 1 && (
          <>
            <h1>Your Skills</h1>
            <div
              style={{
                display: "flex",
                gap: "var(--space-sm)",
                marginBottom: "var(--space-md)",
              }}
            >
              <Input
                placeholder="Skill (e.g. React)"
                value={skillInput.name}
                onChange={(e) =>
                  setSkillInput({ ...skillInput, name: e.target.value })
                }
              />
              <Button onClick={addSkill}>Add</Button>
            </div>
            <div
              style={{
                display: "flex",
                gap: "var(--space-sm)",
                flexWrap: "wrap",
                marginBottom: "var(--space-lg)",
              }}
            >
              {formData.skills.map((s, i) => (
                <Badge key={i} variant="accent">
                  {s.name} ({s.level}){" "}
                  <button
                    onClick={() => removeSkill(i)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    x
                  </button>
                </Badge>
              ))}
            </div>
            <Button onClick={() => setStep(2)}>Next</Button>
          </>
        )}
        {step === 2 && (
          <>
            <h1>Preferences</h1>
            <Input
              label="Target Roles (comma separated)"
              value={formData.targetRoles.join(",")}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  targetRoles: e.target.value.split(","),
                })
              }
            />
            <div className="action-row">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Saving..." : "Submit Profile"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </main>
  );
};

export default CandidateOnboarding;
