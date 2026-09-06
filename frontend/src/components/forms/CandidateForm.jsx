import { useState } from "react";
import api from "../../services/api";

const CandidateForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    skills: [],
    targetRoles: "",
    availability: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users/candidate-profile", {
        ...formData,
        skills: formData.skills.split(","),
        targetRoles: formData.targetRoles.split(","),
      });
      alert("Candidate profile created!");
    } catch {
      alert("Unable to create profile. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "var(--spacing-md)" }}>
      <h1>Candidate Profile</h1>
      <input
        type="text"
        placeholder="Full Name"
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
        style={{ height: "40px", marginBottom: "var(--spacing-sm)" }}
      />
      <input
        type="text"
        placeholder="Skills (comma separated)"
        onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
        required
        style={{ height: "40px", marginBottom: "var(--spacing-sm)" }}
      />
      <button
        type="submit"
        style={{ padding: "var(--spacing-sm) var(--spacing-md)" }}
      >
        Submit
      </button>
    </form>
  );
};

export default CandidateForm;
