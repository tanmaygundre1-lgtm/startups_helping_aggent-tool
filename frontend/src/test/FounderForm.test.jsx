import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FounderForm from "../components/forms/FounderForm";

test("FounderForm submits required data", async () => {
  // Basic test stub
  render(<FounderForm />);
  expect(screen.getByPlaceholderText("Full Name")).toBeDefined();
});
