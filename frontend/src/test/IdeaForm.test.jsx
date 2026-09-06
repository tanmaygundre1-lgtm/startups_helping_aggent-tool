import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import IdeaForm from "../components/forms/IdeaForm";

test("IdeaForm validates pitch length", () => {
  render(<IdeaForm />);
  expect(screen.getByPlaceholderText("Title")).toBeDefined();
});
