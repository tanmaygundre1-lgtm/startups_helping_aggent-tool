import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { updateProfile } from "../../api/userApi";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Card from "../../components/common/Card";

const FounderOnboarding = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bio: "",
    companyStage: "idea",
    expertiseAreas: [],
    yearsExperience: 0,
  });

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateProfile({ ...formData, profileType: "founder" });
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
        <span className="state-kicker">Founder Profile — Step {step} of 2</span>
        {step === 1 && (
          <>
            <h1>About You</h1>
            <Input
              label="Bio"
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
            />
            <Button onClick={handleNext}>Next</Button>
          </>
        )}
        {step === 2 && (
          <>
            <h1>Startup Details</h1>
            <Input
              label="Years of Experience"
              type="number"
              value={formData.yearsExperience}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  yearsExperience: Number(e.target.value),
                })
              }
            />
            <div className="action-row">
              <Button variant="secondary" onClick={handleBack}>
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

export default FounderOnboarding;
