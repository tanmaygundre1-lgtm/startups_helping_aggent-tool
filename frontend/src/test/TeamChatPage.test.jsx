import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ profile: { _id: "user-1", name: "Ava" }, profileType: "candidate" }),
}));

vi.mock("../components/layout/AppLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock("../services/matchingApi", () => ({
  getTeam: vi.fn(),
  listTeamMessages: vi.fn(),
  sendTeamMessage: vi.fn(),
}));

import TeamChatPage from "../pages/dashboard/TeamChatPage";
import {
  getTeam,
  listTeamMessages,
  sendTeamMessage,
} from "../services/matchingApi";

const team = { _id: "team-1", name: "Campus Launchpad", status: "Active" };

const renderChat = () => render(
  <MemoryRouter initialEntries={["/app/teams/team-1/chat"]}>
    <Routes>
      <Route path="/app/teams/:teamId/chat" element={<TeamChatPage />} />
    </Routes>
  </MemoryRouter>,
);

const message = (id, content, senderId = "user-2", createdAt = "2026-10-14T10:00:00.000Z") => ({
  _id: id,
  content,
  createdAt,
  senderId: { _id: senderId, name: senderId === "user-1" ? "Ava" : "Milo" },
});

describe("TeamChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTeam.mockResolvedValue({ success: true, team });
  });

  test("renders messages chronologically and loads older pages", async () => {
    listTeamMessages
      .mockResolvedValueOnce({
        success: true,
        messages: [
          message("message-2", "Second", "user-2", "2026-10-14T10:02:00.000Z"),
          message("message-3", "Third", "user-1", "2026-10-14T10:03:00.000Z"),
        ],
        pagination: { page: 1, limit: 50, total: 3, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        success: true,
        messages: [message("message-1", "First", "user-2", "2026-10-14T10:01:00.000Z")],
        pagination: { page: 2, limit: 50, total: 3, totalPages: 2 },
      });

    renderChat();

    expect(await screen.findByRole("heading", { name: "Campus Launchpad" })).toBeDefined();
    expect(screen.getByText("Milo")).toBeDefined();
    expect(screen.getByText("Ava")).toBeDefined();

    const initialArticles = screen.getAllByRole("article");
    expect(initialArticles.map((article) => article.textContent)).toEqual([
      expect.stringContaining("Second"),
      expect.stringContaining("Third"),
    ]);

    fireEvent.click(screen.getByRole("button", { name: /Load older messages/i }));

    await waitFor(() => expect(listTeamMessages).toHaveBeenLastCalledWith("team-1", 2, 50));
    expect(screen.getAllByRole("article").map((article) => article.textContent)).toEqual([
      expect.stringContaining("First"),
      expect.stringContaining("Second"),
      expect.stringContaining("Third"),
    ]);
  });

  test("sends a non-empty message with Enter and clears the composer only after success", async () => {
    listTeamMessages.mockResolvedValue({
      success: true,
      messages: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
    sendTeamMessage.mockResolvedValue({
      success: true,
      message: message("message-1", "Hello team", "user-1"),
    });

    renderChat();
    const composer = await screen.findByLabelText("Message");
    fireEvent.change(composer, { target: { value: " Hello team " } });
    fireEvent.keyDown(composer, { key: "Enter" });

    await waitFor(() => expect(sendTeamMessage).toHaveBeenCalledWith("team-1", "Hello team"));
    expect(composer.value).toBe("");
    expect(screen.getByText("Hello team")).toBeDefined();
  });

  test("prevents empty sends and keeps failed messages out of history", async () => {
    listTeamMessages.mockResolvedValue({
      success: true,
      messages: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
    sendTeamMessage.mockRejectedValue(new Error("Message was not saved"));

    renderChat();
    const composer = await screen.findByLabelText("Message");
    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton.disabled).toBe(true);

    fireEvent.change(composer, { target: { value: "Unsent message" } });
    fireEvent.click(sendButton);

    expect((await screen.findByRole("alert")).textContent).toContain("Message was not saved");
    expect(sendTeamMessage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("article")).toBeNull();
    expect(composer.value).toBe("Unsent message");
  });
});