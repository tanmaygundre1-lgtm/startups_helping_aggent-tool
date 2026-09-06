import { useState } from "react";
import api from "../../services/api";

const IdeaForm = () => {
  const [formData, setFormData] = useState({
    title: "",
    pitch: "",
    domain: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.pitch.length < 50) {
      alert("Pitch must be at least 50 characters.");
      return;
    }
    try {
      await api.post("/ideas", {
        title: formData.title,
        description: formData.pitch,
        domain: formData.domain,
      });
      alert("Idea created successfully!");
    } catch {
      alert("Unable to create idea. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "var(--spacing-md)" }}>
      <h1>Create New Idea</h1>
      <input
        type="text"
        placeholder="Title"
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
        style={{ height: "40px", marginBottom: "var(--spacing-sm)" }}
      />
      <textarea
        placeholder="Pitch (min 50 chars)"
        onChange={(e) => setFormData({ ...formData, pitch: e.target.value })}
        required
        style={{ minHeight: "100px", marginBottom: "var(--spacing-sm)" }}
      />
      <button
        type="submit"
        style={{ padding: "var(--spacing-sm) var(--spacing-md)" }}
      >
        Submit Idea
      </button>
    </form>
  );
};

export default IdeaForm;
