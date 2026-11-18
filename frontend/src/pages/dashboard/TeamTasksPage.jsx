import { useCallback, useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  ColumnApiModule,
  ModuleRegistry,
  PaginationModule,
  SelectEditorModule,
  TextEditorModule,
  TextFilterModule,
  themeQuartz,
} from "ag-grid-community";
import { ArrowDownToLine, Plus, RefreshCw, Upload } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import { useAuth } from "../../hooks/useAuth";
import { getTeam } from "../../services/matchingApi";
import {
  commitTeamTaskImport,
  createTeamTask,
  downloadTeamTaskTemplate,
  getTeamTaskSummary,
  listTeamTasks,
  previewTeamTaskImport,
  updateTeamTask,
} from "../../services/taskApi";

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ClientSideRowModelApiModule,
  ColumnApiModule,
  PaginationModule,
  SelectEditorModule,
  TextEditorModule,
  TextFilterModule,
]);

const taskTheme = themeQuartz.withParams({
  accentColor: "#4f46e5",
  borderColor: "#e5e7eb",
  browserColorScheme: "light",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 13,
  headerBackgroundColor: "#f8fafc",
  headerFontWeight: 700,
  rowHoverColor: "#f8fafc",
});

const PRIORITIES = ["Low", "Medium", "High"];

const idOf = (value) => String(value?._id || value || "");

const gridTask = (task) => ({
  ...task,
  assignedToId: idOf(task.assignedTo),
  assignedToName: task.assignedTo?.name || "Team member",
  completionEvidence: task.completionEvidence || "",
  deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : "",
});

const formatStatus = (status) => status?.replaceAll("_", " ") || "TODO";
const errorMessage = (error) =>
  error?.message || "The task request could not be completed.";

const TeamTasksPage = () => {
  const { teamId } = useParams();
  const { profile, profileType } = useAuth();
  const isFounder = profileType === "founder";
  const [team, setTeam] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    deadline: "",
    priority: "Medium",
    assignedTo: "",
    evidenceRequired: false,
  });
  const [preview, setPreview] = useState(null);

  const loadWorkspace = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const [teamResponse, taskResponse, summaryResponse] = await Promise.all([
        getTeam(teamId),
        listTeamTasks(teamId),
        getTeamTaskSummary(teamId),
      ]);
      setTeam(teamResponse?.team || teamResponse);
      setTasks((taskResponse?.tasks || []).map(gridTask));
      setSummary(summaryResponse?.summary || null);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkspace(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadWorkspace();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loadWorkspace]);

  const employees = useMemo(() => {
    const founder = team?.founderId && typeof team.founderId === "object"
      ? team.founderId
      : null;
    const members = (team?.members || []).map((member) => (
      typeof member.userId === "object" ? member.userId : null
    )).filter(Boolean);
    const entries = [...(founder ? [founder] : []), ...members];
    if (!entries.some((employee) => idOf(employee) === idOf(profile))) {
      entries.push(profile);
    }
    return entries.filter((employee, index) => (
      employee?._id && entries.findIndex((other) => idOf(other) === idOf(employee)) === index
    ));
  }, [profile, team]);

  const employeeLabels = useMemo(() => new Map(
    employees.map((employee) => [
      idOf(employee),
      employee.name || "Team member",
    ]),
  ), [employees]);

  const saveGridChange = useCallback(async (event) => {
    const { data, colDef, oldValue, newValue, node } = event;
    if (oldValue === newValue) return;
    const field = colDef.field;
    const payload = { version: data.version };
    if (field === "assignedToId") payload.assignedTo = newValue;
    else if (field === "deadline") payload.deadline = newValue || null;
    else if (["title", "priority", "status", "completionEvidence"].includes(field)) {
      payload[field] = newValue;
    } else return;

    if (field === "status" && newValue === "SKIPPED") {
      const reason = window.prompt("Why are you skipping this task? (at least 3 characters)");
      if (!reason || reason.trim().length < 3) {
        node.setDataValue(field, oldValue);
        setNotice("Skipping a task requires a reason of at least 3 characters.");
        return;
      }
      payload.skipReason = reason.trim().slice(0, 1000);
    }

    setNotice("Saving task change...");
    try {
      const response = await updateTeamTask(teamId, data._id, payload);
      node.setData(gridTask(response.task));
      setTasks((current) => current.map((task) => (
        task._id === data._id ? gridTask(response.task) : task
      )));
      setNotice("Task saved.");
      const summaryResponse = await getTeamTaskSummary(teamId);
      setSummary(summaryResponse?.summary || null);
    } catch (requestError) {
      node.setDataValue(field, oldValue);
      setNotice(errorMessage(requestError));
      await loadWorkspace();
    }
  }, [loadWorkspace, teamId]);

  const columnDefs = useMemo(() => [
    {
      headerName: "Employee Name",
      field: "assignedToId",
      minWidth: 210,
      editable: isFounder,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: { values: [...employeeLabels.keys()] },
      valueFormatter: (params) => employeeLabels.get(params.value) || "Team member",
    },
    {
      headerName: "Task",
      field: "title",
      minWidth: 220,
      flex: 1,
      editable: isFounder,
    },
    {
      headerName: "Deadline",
      field: "deadline",
      minWidth: 140,
      editable: isFounder,
      cellEditor: "agTextCellEditor",
      valueFormatter: (params) => params.value
        ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${params.value}T00:00:00`))
        : "—",
    },
    {
      headerName: "Completion Evidence",
      field: "completionEvidence",
      minWidth: 240,
      editable: !isFounder,
      cellRenderer: (params) => params.value
        ? <a href={params.value} target="_blank" rel="noreferrer">View evidence</a>
        : params.data.evidenceRequired ? "Required" : "—",
    },
    {
      headerName: "Status",
      field: "status",
      minWidth: 150,
      editable: !isFounder,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: (params) => {
        const status = params.data.status;
        const options = status === "TODO"
          ? ["TODO", "IN_PROGRESS", "SKIPPED"]
          : status === "IN_PROGRESS"
            ? ["IN_PROGRESS", "COMPLETED", "SKIPPED", "BLOCKED"]
            : status === "BLOCKED"
              ? ["BLOCKED", "IN_PROGRESS"]
              : status === "SKIPPED"
                ? ["SKIPPED", "TODO"]
                : [status];
        return { values: options };
      },
      valueFormatter: (params) => formatStatus(params.value),
    },
    ...(isFounder ? [{
      headerName: "Priority",
      field: "priority",
      minWidth: 120,
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: { values: PRIORITIES },
    }] : []),
  ], [employeeLabels, isFounder]);

  const downloadTemplate = async () => {
    setError("");
    try {
      const blob = await downloadTeamTaskTemplate(teamId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `team-${teamId}-tasks-template.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const previewFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setPreview(null);
    setNotice("");
    setError("");
    try {
      setPreview(await previewTeamTaskImport(teamId, file));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const commitPreview = async () => {
    if (!preview?.previewId) return;
    setBusy(true);
    setError("");
    try {
      const response = await commitTeamTaskImport(teamId, {
        previewId: preview.previewId,
        fileName: preview.fileName,
        rows: preview.rows,
      });
      setNotice(`${response.counts?.createdCount ?? response.batch?.createdCount ?? 0} tasks assigned.`);
      setPreview(null);
      await loadWorkspace();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const createTask = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createTeamTask(teamId, {
        ...newTask,
        deadline: newTask.deadline || null,
        assignedTo: newTask.assignedTo || undefined,
      });
      setNewTask({
        title: "",
        description: "",
        deadline: "",
        priority: "Medium",
        assignedTo: "",
        evidenceRequired: false,
      });
      setShowCreateForm(false);
      setNotice("Task created and assigned.");
      await loadWorkspace();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <main className="page-shell task-workspace">
        <header className="page-header task-workspace-header">
          <div>
            <Link className="chat-back-link" to={isFounder ? "/app/founder-team" : "/app/team"}>
              Back to teams
            </Link>
            <span className="eyebrow">{isFounder ? "Team workspace" : "Employee workspace"}</span>
            <h1>{isFounder ? team?.name || "Team tasks" : "My Tasks"}</h1>
            <p>{isFounder ? "Assign work and track progress across your team." : "Your assigned work and task progress."}</p>
          </div>
          <div className="task-workspace-actions">
            <Button variant="secondary" onClick={() => void loadWorkspace(true)} disabled={loading}>
              <RefreshCw size={16} /> Refresh
            </Button>
            {isFounder && (
              <>
                <Button variant="secondary" onClick={downloadTemplate}>
                  <ArrowDownToLine size={16} /> Excel template
                </Button>
                <label className="button button-secondary task-upload-button">
                  <Upload size={16} /> {busy ? "Working..." : "Import sheet"}
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={previewFile}
                    disabled={busy}
                    aria-label="Import tasks from Excel or CSV"
                  />
                </label>
                <Button onClick={() => setShowCreateForm((shown) => !shown)}>
                  <Plus size={16} /> Add task
                </Button>
              </>
            )}
          </div>
        </header>

        {error && <Card><p className="task-message task-message-error" role="alert">{error}</p></Card>}
        {notice && <p className="task-message" role="status">{notice}</p>}

        {summary && (
          <section className="task-summary-grid" aria-label="Team task progress">
            <Card className="task-summary-overall">
              <span>Overall completion</span>
              <strong>{summary.overall?.completionPercent || 0}%</strong>
              <div className="task-progress-track" role="progressbar" aria-valuenow={summary.overall?.completionPercent || 0} aria-valuemin="0" aria-valuemax="100">
                <span style={{ width: `${summary.overall?.completionPercent || 0}%` }} />
              </div>
              <small>{summary.overall?.completed || 0} of {summary.overall?.total || 0} tasks completed</small>
            </Card>
            {(summary.employees || []).map((employee) => (
              <Card className="task-summary-person" key={employee.userId}>
                <strong>{employee.name}{employee.userId === idOf(profile) ? " (You)" : ""}</strong>
                <span>{employee.completed}/{employee.total} completed</span>
                <small>{employee.inProgress} in progress · {employee.overdue} overdue · {employee.skipped} skipped</small>
              </Card>
            ))}
          </section>
        )}

        {showCreateForm && isFounder && (
          <Card className="task-form-card">
            <h2>Create a task</h2>
            <form className="task-create-form" onSubmit={createTask}>
              <label>Task title<input required minLength="2" maxLength="200" value={newTask.title} onChange={(event) => setNewTask({ ...newTask, title: event.target.value })} /></label>
              <label>Description<textarea maxLength="4000" value={newTask.description} onChange={(event) => setNewTask({ ...newTask, description: event.target.value })} /></label>
              <label>Assign to<select value={newTask.assignedTo} onChange={(event) => setNewTask({ ...newTask, assignedTo: event.target.value })}><option value="">Auto-assign by workload</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name} {employee.email ? `(${employee.email})` : ""}</option>)}</select></label>
              <label>Deadline<input type="date" value={newTask.deadline} onChange={(event) => setNewTask({ ...newTask, deadline: event.target.value })} /></label>
              <label>Priority<select value={newTask.priority} onChange={(event) => setNewTask({ ...newTask, priority: event.target.value })}>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
              <label className="task-checkbox-label"><input type="checkbox" checked={newTask.evidenceRequired} onChange={(event) => setNewTask({ ...newTask, evidenceRequired: event.target.checked })} /> Evidence required to complete</label>
              <Button type="submit" disabled={busy}>Create task</Button>
            </form>
          </Card>
        )}

        {preview && (
          <Card className="task-import-preview">
            <div className="task-import-heading">
              <div><h2>Import preview</h2><p>{preview.fileName} · {preview.createdCount} valid · {preview.skippedCount} errors</p></div>
              <div className="task-workspace-actions">
                <Button variant="secondary" onClick={() => setPreview(null)}>Cancel</Button>
                <Button onClick={commitPreview} disabled={busy || preview.createdCount === 0}>
                  {busy ? "Assigning..." : `Assign ${preview.createdCount} tasks`}
                </Button>
              </div>
            </div>
            <div className="task-preview-table-wrap">
              <table className="task-preview-table">
                <thead><tr><th>Row</th><th>Employee</th><th>Task</th><th>Deadline</th><th>Priority</th><th>Result</th></tr></thead>
                <tbody>{preview.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>{row.employee?.name || "—"}{row.employee?.email ? <small>{row.employee.email}</small> : null}</td>
                    <td>{row.task?.title || "—"}</td>
                    <td>{row.task?.deadline ? new Date(row.task.deadline).toLocaleDateString() : "—"}{row.warnings?.map((warning) => <small key={warning} className="task-warning">{warning}</small>)}</td>
                    <td>{row.task?.priority || "—"}</td>
                    <td className={row.status === "valid" ? "task-import-valid" : "task-import-error"}>{row.status === "valid" ? "Ready" : row.reason}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>
        )}

        <Card className="task-grid-card">
          <div className="task-grid-heading">
            <div><h2>{isFounder ? "Team tasks" : "Assigned to me"}</h2><p>{isFounder ? "Changes save to MongoDB as you edit." : "Update status and add completion evidence in the grid."}</p></div>
            <span>{tasks.length} tasks</span>
          </div>
          {loading ? <p>Loading tasks...</p> : (
            <div className="ag-theme-quartz task-grid">
              <AgGridReact
                theme={taskTheme}
                rowData={tasks}
                columnDefs={columnDefs}
                defaultColDef={{ resizable: true, sortable: true, filter: true, editable: false }}
                getRowId={(params) => params.data._id}
                onCellValueChanged={saveGridChange}
                pagination
                paginationPageSize={20}
                singleClickEdit
                stopEditingWhenCellsLoseFocus
                overlayNoRowsTemplate={isFounder ? "No tasks yet. Add a task or import a sheet." : "You have no assigned tasks yet."}
              />
            </div>
          )}
        </Card>
      </main>
    </AppLayout>
  );
};

export default TeamTasksPage;
