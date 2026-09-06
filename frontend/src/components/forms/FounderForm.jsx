import { useState } from "react";
import api from "../../services/api";

const FounderForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    university: "",
    major: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users/profile", { ...formData, profileType: "founder" });
      alert("Profile created!");
    } catch {
      alert("Unable to create profile. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "var(--spacing-md)" }}>
      <h1>Founder Profile</h1>
      <input
        type="text"
        placeholder="Full Name"
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
        style={{ height: "40px", marginBottom: "var(--spacing-sm)" }}
      />
      <input
        type="text"
        placeholder="University"
        onChange={(e) =>
          setFormData({ ...formData, university: e.target.value })
        }
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

export default FounderForm;
