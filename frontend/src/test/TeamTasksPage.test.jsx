import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  gridProps: null,
  getTeam: vi.fn(),
  listTeamTasks: vi.fn(),
  getTeamTaskSummary: vi.fn(),
  updateTeamTask: vi.fn(),
  createTeamTask: vi.fn(),
  previewTeamTaskImport: vi.fn(),
  commitTeamTaskImport: vi.fn(),
  downloadTeamTaskTemplate: vi.fn(),
}));

vi.mock("ag-grid-react", () => ({
  AgGridReact: (props) => {
    mocks.gridProps = props;
    return <div data-testid="task-grid" />;
  },
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    profile: { _id: "employee-1", name: "Milo Member" },
    profileType: "candidate",
  }),
}));

vi.mock("../components/layout/AppLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock("../services/matchingApi", () => ({
  getTeam: mocks.getTeam,
}));

vi.mock("../services/taskApi", () => ({
  listTeamTasks: mocks.listTeamTasks,
  getTeamTaskSummary: mocks.getTeamTaskSummary,
  updateTeamTask: mocks.updateTeamTask,
  createTeamTask: mocks.createTeamTask,
  previewTeamTaskImport: mocks.previewTeamTaskImport,
  commitTeamTaskImport: mocks.commitTeamTaskImport,
  downloadTeamTaskTemplate: mocks.downloadTeamTaskTemplate,
}));

import TeamTasksPage from "../pages/dashboard/TeamTasksPage";

const task = {
  _id: "task-1",
  title: "Build login API",
  status: "TODO",
  version: 3,
  assignedTo: { _id: "employee-1", name: "Milo Member" },
};

const renderTasks = () => render(
  <MemoryRouter initialEntries={["/app/teams/team-1/tasks"]}>
    <Routes>
      <Route path="/app/teams/:teamId/tasks" element={<TeamTasksPage />} />
    </Routes>
  </MemoryRouter>,
);

describe("TeamTasksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.gridProps = null;
    mocks.getTeam.mockResolvedValue({
      team: {
        _id: "team-1",
        founderId: { _id: "founder-1", name: "Ava Founder" },
        members: [{ userId: { _id: "employee-1", name: "Milo Member" } }],
      },
    });
    mocks.listTeamTasks.mockResolvedValue({ tasks: [task] });
    mocks.getTeamTaskSummary.mockResolvedValue({
      summary: {
        employees: [{
          userId: "employee-1",
          name: "Milo Member",
          total: 1,
          completed: 0,
          inProgress: 0,
          overdue: 0,
          skipped: 0,
        }],
        overall: { total: 1, completed: 0, completionPercent: 0 },
      },
    });
    mocks.updateTeamTask.mockResolvedValue({ task: { ...task, status: "IN_PROGRESS", version: 4 } });
  });

  test("loads My Tasks with backend-derived progress and AG Grid", async () => {
    renderTasks();
    expect(await screen.findByRole("heading", { name: "My Tasks" })).toBeDefined();
    expect(await screen.findByText("0/1 completed")).toBeDefined();
    expect(screen.getByTestId("task-grid")).toBeDefined();
    expect(mocks.listTeamTasks).toHaveBeenCalledWith("team-1");
    expect(mocks.gridProps.getRowId({ data: task })).toBe("task-1");
  });

  test("persists an employee status change through the task API", async () => {
    renderTasks();
    await screen.findByRole("heading", { name: "My Tasks" });
    await waitFor(() => expect(mocks.gridProps).not.toBeNull());
    const node = {
      setData: vi.fn(),
      setDataValue: vi.fn(),
    };

    await mocks.gridProps.onCellValueChanged({
      data: { ...task, assignedToId: "employee-1" },
      colDef: { field: "status" },
      oldValue: "TODO",
      newValue: "IN_PROGRESS",
      node,
    });

    expect(mocks.updateTeamTask).toHaveBeenCalledWith("team-1", "task-1", {
      version: 3,
      status: "IN_PROGRESS",
    });
    expect(node.setData).toHaveBeenCalledWith(expect.objectContaining({
      status: "IN_PROGRESS",
      version: 4,
    }));
    expect(await screen.findByText("Task saved.")).toBeDefined();
  });
});
