import { createElement } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  gridProps: null,
  previewGridProps: null,
  getTeam: vi.fn(),
  listTeamTasks: vi.fn(),
  getTeamTaskSummary: vi.fn(),
  updateTeamTask: vi.fn(),
  createTeamTask: vi.fn(),
  previewTeamTaskImport: vi.fn(),
  commitTeamTaskImport: vi.fn(),
  downloadTeamTaskTemplate: vi.fn(),
  undoTeamTaskImport: vi.fn(),
  profileType: "candidate",
}));

vi.mock("ag-grid-react", () => ({
  AgGridReact: (props) => {
    mocks.gridProps = props;
    if (props.rowData?.some((row) => row.rowNumber)) mocks.previewGridProps = props;
    return <div data-testid="task-grid" />;
  },
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    profile: { _id: "employee-1", name: "Milo Member" },
    profileType: mocks.profileType,
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
  undoTeamTaskImport: mocks.undoTeamTaskImport,
}));

import TeamTasksPage, { EvidenceCell } from "../pages/dashboard/TeamTasksPage";

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

const renderTaskCell = (columnId, row) => {
  const column = mocks.gridProps.columnDefs.find((definition) => (
    definition.colId === columnId || definition.field === columnId
  ));
  return render(createElement(column.cellRenderer, {
    data: row,
    value: row.completionEvidence || "",
    context: mocks.gridProps.context,
  }));
};

describe("TeamTasksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.gridProps = null;
    mocks.previewGridProps = null;
    mocks.profileType = "candidate";
    mocks.getTeam.mockResolvedValue({
      team: {
        _id: "team-1",
        name: "Launch Team",
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
    mocks.previewTeamTaskImport.mockResolvedValue({
      previewId: "preview-1",
      fileName: "tasks.csv",
      createdCount: 1,
      skippedCount: 1,
      rows: [
        {
          rowNumber: 2,
          status: "valid",
          employee: { name: "Milo Member" },
          task: { title: "Build login API", priority: "High" },
        },
        {
          rowNumber: 3,
          status: "error",
          reason: "Unknown employee",
          task: { title: "Write docs", priority: "Medium" },
        },
      ],
    });
    mocks.commitTeamTaskImport.mockResolvedValue({
      batch: { _id: "batch-1" },
      counts: { createdCount: 1 },
    });
    mocks.undoTeamTaskImport.mockResolvedValue({ deletedCount: 1, retainedCount: 0 });
  });

  test("loads My Tasks with backend-derived progress and AG Grid", async () => {
    renderTasks();
    expect(await screen.findByRole("heading", { name: "My Tasks" })).toBeDefined();
    expect(await screen.findByText("0 of 1 tasks completed")).toBeDefined();
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
    expect(await screen.findByText("Saved ✓")).toBeDefined();
  });

  test("reproduces completion rollback because the status PATCH omits evidence", async () => {
    const taskInProgress = { ...task, status: "IN_PROGRESS", evidenceRequired: true };
    mocks.listTeamTasks.mockResolvedValue({ tasks: [taskInProgress] });
    mocks.updateTeamTask.mockRejectedValue({
      response: {
        data: {
          code: "EVIDENCE_REQUIRED",
          message: "Valid completion evidence is required",
        },
      },
    });
    renderTasks();
    await screen.findByRole("heading", { name: "My Tasks" });
    await waitFor(() => expect(mocks.gridProps).not.toBeNull());
    const node = { setData: vi.fn(), setDataValue: vi.fn() };

    await mocks.gridProps.onCellValueChanged({
      data: { ...taskInProgress, assignedToId: "employee-1" },
      colDef: { field: "status" },
      oldValue: "IN_PROGRESS",
      newValue: "COMPLETED",
      node,
    });

    expect(mocks.updateTeamTask).toHaveBeenCalledWith("team-1", "task-1", {
      version: 3,
      status: "COMPLETED",
    });
    expect(node.setDataValue).toHaveBeenCalledWith("status", "IN_PROGRESS");
    expect(await screen.findByText(/Valid completion evidence is required/)).toBeDefined();
  });

  test("evidence input retains its controlled draft and saves once on blur", async () => {
    const activeTask = { ...task, status: "IN_PROGRESS", evidenceRequired: true };
    mocks.listTeamTasks.mockResolvedValue({ tasks: [activeTask] });
    mocks.updateTeamTask.mockResolvedValue({
      task: { ...activeTask, completionEvidence: "https://example.com/proof", version: 4 },
    });

    renderTasks();
    await screen.findByRole("heading", { name: "My Tasks" });
    await waitFor(() => expect(mocks.gridProps).not.toBeNull());
    renderTaskCell("completionEvidence", activeTask);
    const input = screen.getByRole("textbox", { name: "Evidence link for Build login API" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "https://example.com/proof" } });
    fireEvent.blur(input);

    await waitFor(() => expect(mocks.updateTeamTask).toHaveBeenCalledTimes(1));
    expect(mocks.updateTeamTask).toHaveBeenCalledWith("team-1", "task-1", {
      version: 3,
      completionEvidence: "https://example.com/proof",
    });
    expect(input.value).toBe("https://example.com/proof");
    expect(await screen.findByText("Saved")).toBeDefined();
  });

  test("failed evidence save keeps the typed draft and shows backend error", async () => {
    const activeTask = { ...task, status: "IN_PROGRESS", evidenceRequired: true };
    mocks.listTeamTasks.mockResolvedValue({ tasks: [activeTask] });
    mocks.updateTeamTask.mockRejectedValue({
      response: { data: { code: "INVALID_EVIDENCE", message: "Completion evidence must be an HTTP or HTTPS URL" } },
    });

    renderTasks();
    await screen.findByRole("heading", { name: "My Tasks" });
    await waitFor(() => expect(mocks.gridProps).not.toBeNull());
    renderTaskCell("completionEvidence", activeTask);
    const input = screen.getByRole("textbox", { name: "Evidence link for Build login API" });
    fireEvent.change(input, { target: { value: "https://example.com/proof" } });
    fireEvent.blur(input);

    expect(await screen.findByText("Completion evidence must be an HTTP or HTTPS URL")).toBeDefined();
    expect(input.value).toBe("https://example.com/proof");
  });

  test("invalid evidence link is rejected inline before making a PATCH", async () => {
    const activeTask = { ...task, status: "IN_PROGRESS", evidenceRequired: true };
    mocks.listTeamTasks.mockResolvedValue({ tasks: [activeTask] });

    renderTasks();
    await screen.findByRole("heading", { name: "My Tasks" });
    await waitFor(() => expect(mocks.gridProps).not.toBeNull());
    renderTaskCell("completionEvidence", activeTask);
    const input = screen.getByRole("textbox", { name: "Evidence link for Build login API" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "not-a-link" } });
    fireEvent.blur(input);

    expect(await screen.findByText("Enter a valid link starting with https://")).toBeDefined();
    expect(input.value).toBe("not-a-link");
    expect(mocks.updateTeamTask).not.toHaveBeenCalled();
  });

  test("completion modal sends status and evidence in one PATCH and uses server task", async () => {
    const activeTask = { ...task, status: "IN_PROGRESS", evidenceRequired: true };
    const completedTask = {
      ...activeTask,
      status: "COMPLETED",
      completionEvidence: "https://example.com/proof",
      completedAt: "2026-11-18T10:00:00.000Z",
      version: 4,
    };
    mocks.listTeamTasks.mockResolvedValue({ tasks: [activeTask] });
    mocks.updateTeamTask.mockResolvedValue({ task: completedTask });

    renderTasks();
    await screen.findByRole("heading", { name: "My Tasks" });
    await waitFor(() => expect(mocks.gridProps).not.toBeNull());
    const actionColumn = mocks.gridProps.columnDefs.find((column) => column.colId === "taskActions");
    render(createElement(actionColumn.cellRenderer, {
      data: activeTask,
      context: mocks.gridProps.context,
    }));
    fireEvent.click(screen.getByRole("button", { name: "Mark completed" }));
    const dialog = await screen.findByRole("dialog");
    const evidence = within(dialog).getByLabelText("Evidence link (required)");
    fireEvent.change(evidence, { target: { value: "https://example.com/proof" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark completed" }));

    await waitFor(() => expect(mocks.updateTeamTask).toHaveBeenCalledTimes(1));
    expect(mocks.updateTeamTask).toHaveBeenCalledWith("team-1", "task-1", {
      status: "COMPLETED",
      completionEvidence: "https://example.com/proof",
      version: 3,
    });
    await waitFor(() => expect(mocks.gridProps.rowData[0].status).toBe("COMPLETED"));
    expect(mocks.gridProps.rowData[0].version).toBe(4);
    expect(mocks.gridProps.rowData[0].completedAt).toBe(completedTask.completedAt);
  });

  test("completion uses the server version returned by the prior evidence save", async () => {
    const activeTask = { ...task, status: "IN_PROGRESS", evidenceRequired: true };
    const evidenceSavedTask = {
      ...activeTask,
      completionEvidence: "https://example.com/proof",
      version: 4,
    };
    const completedTask = {
      ...evidenceSavedTask,
      status: "COMPLETED",
      completedAt: "2026-11-18T10:00:00.000Z",
      version: 5,
    };
    mocks.listTeamTasks.mockResolvedValue({ tasks: [activeTask] });
    mocks.updateTeamTask
      .mockResolvedValueOnce({ task: evidenceSavedTask })
      .mockResolvedValueOnce({ task: completedTask });

    renderTasks();
    await screen.findByRole("heading", { name: "My Tasks" });
    await waitFor(() => expect(mocks.gridProps).not.toBeNull());
    renderTaskCell("completionEvidence", activeTask);
    const evidenceInput = screen.getByRole("textbox", { name: "Evidence link for Build login API" });
    fireEvent.focus(evidenceInput);
    fireEvent.change(evidenceInput, { target: { value: "https://example.com/proof" } });
    fireEvent.blur(evidenceInput);
    await waitFor(() => expect(mocks.updateTeamTask).toHaveBeenCalledTimes(1));

    const latestRow = mocks.gridProps.rowData[0];
    const actionColumn = mocks.gridProps.columnDefs.find((column) => column.colId === "taskActions");
    render(createElement(actionColumn.cellRenderer, {
      data: latestRow,
      context: mocks.gridProps.context,
    }));
    fireEvent.click(screen.getByRole("button", { name: "Mark completed" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Evidence link (required)").value).toBe("https://example.com/proof");
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark completed" }));

    await waitFor(() => expect(mocks.updateTeamTask).toHaveBeenCalledTimes(2));
    expect(mocks.updateTeamTask).toHaveBeenLastCalledWith("team-1", "task-1", {
      status: "COMPLETED",
      completionEvidence: "https://example.com/proof",
      version: 4,
    });
    await waitFor(() => expect(mocks.gridProps.rowData[0].version).toBe(5));
  });

  test("failed completion restores status but retains modal draft and backend error", async () => {
    const activeTask = { ...task, status: "IN_PROGRESS", evidenceRequired: true };
    mocks.listTeamTasks.mockResolvedValue({ tasks: [activeTask] });
    mocks.updateTeamTask.mockRejectedValue({
      response: { data: { code: "EVIDENCE_REQUIRED", message: "Evidence link could not be verified" } },
    });

    renderTasks();
    await screen.findByRole("heading", { name: "My Tasks" });
    await waitFor(() => expect(mocks.gridProps).not.toBeNull());
    const actionColumn = mocks.gridProps.columnDefs.find((column) => column.colId === "taskActions");
    render(createElement(actionColumn.cellRenderer, {
      data: activeTask,
      context: mocks.gridProps.context,
    }));
    fireEvent.click(screen.getByRole("button", { name: "Mark completed" }));
    const dialog = await screen.findByRole("dialog");
    const evidence = within(dialog).getByLabelText("Evidence link (required)");
    fireEvent.change(evidence, { target: { value: "https://example.com/proof" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark completed" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Evidence link could not be verified");
    expect(evidence.value).toBe("https://example.com/proof");
    await waitFor(() => expect(mocks.gridProps.rowData[0].status).toBe("IN_PROGRESS"));
  });

  test("background task refresh does not clear an evidence draft while editing", async () => {
    const context = {
      saveEvidence: vi.fn(() => new Promise(() => {})),
      setEvidenceEditing: vi.fn(),
    };
    const row = { ...task, status: "IN_PROGRESS", evidenceRequired: true };
    const { rerender } = render(createElement(EvidenceCell, {
      data: row,
      value: "",
      context,
    }));
    const input = screen.getByRole("textbox", { name: "Evidence link for Build login API" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "https://example.com/draft" } });
    rerender(createElement(EvidenceCell, {
      data: row,
      value: "https://example.com/server-refresh",
      context,
    }));

    expect(input.value).toBe("https://example.com/draft");
    expect(context.setEvidenceEditing).toHaveBeenCalledWith("task-1", true);
  });

  test("founder sees progress cards, employee tab, and three-step import preview", async () => {
    mocks.profileType = "founder";
    mocks.getTeamTaskSummary.mockResolvedValue({
      summary: {
        employees: [{
          userId: "employee-1",
          name: "Milo Member",
          total: 1,
          completed: 0,
          inProgress: 0,
          overdue: 1,
          skipped: 0,
        }],
        overall: { total: 1, completed: 0, completionPercent: 0 },
      },
    });

    renderTasks();
    expect(await screen.findByRole("heading", { name: "Launch Team" })).toBeDefined();
    expect(await screen.findByText("Overdue")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Per-employee" }));
    expect(await screen.findByText("1 overdue")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Tasks" }));

    fireEvent.click(screen.getByRole("button", { name: /Import from Excel/ }));
    expect(await screen.findByText("Drop an Excel or CSV file here")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Choose file"), {
      target: { files: [new File(["rows"], "tasks.csv", { type: "text/csv" })] },
    });
    expect(await screen.findByText("1 valid")).toBeDefined();
    await waitFor(() => expect(mocks.previewGridProps.rowData[1].reason).toBe("Unknown employee"));
    fireEvent.click(screen.getByRole("button", { name: "Continue to assignment" }));
    expect(await screen.findByText(/Ready to assign/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Assign 1 tasks" }));
    expect(await screen.findByText("1 tasks assigned.")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Undo import" }));
    expect(await screen.findByText(/Import undone/)).toBeDefined();
    expect(mocks.undoTeamTaskImport).toHaveBeenCalledWith("team-1", "batch-1");
  });
});
