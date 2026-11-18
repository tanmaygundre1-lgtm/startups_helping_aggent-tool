import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  ArrowDownToLine,
  Check,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";
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
  undoTeamTaskImport,
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
const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "SKIPPED", "BLOCKED"];

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
  error?.response?.data?.message || error?.message || "The task request could not be completed.";

const validateEvidenceUrl = (value) => {
  if (!value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol)
      ? ""
      : "Enter a valid link starting with https://";
  } catch {
    return "Enter a valid link starting with https://";
  }
};

const EvidenceCell = (params) => {
  const { data, value, context } = params;
  const [draft, setDraft] = useState(value || "");
  const [fieldStatus, setFieldStatus] = useState("Saved");
  const [fieldError, setFieldError] = useState("");
  const editingRef = useRef(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current && !dirtyRef.current) {
      setDraft(value || "");
      setFieldStatus("Saved");
      setFieldError("");
    }
  }, [value]);

  const saveDraft = async () => {
    editingRef.current = false;
    if (!dirtyRef.current) {
      context.setEvidenceEditing(data._id, false);
      return;
    }
    const validationMessage = validateEvidenceUrl(draft);
    if (validationMessage) {
      context.setEvidenceEditing(data._id, false);
      setFieldStatus("Failed");
      setFieldError(validationMessage);
      return;
    }
    if (draft.trim() === (value || "")) {
      context.setEvidenceEditing(data._id, false);
      dirtyRef.current = false;
      setFieldStatus("Saved");
      setFieldError("");
      return;
    }

    setFieldStatus("Saving...");
    setFieldError("");
    const result = await context.saveEvidence(data._id, draft.trim());
    context.setEvidenceEditing(data._id, false);
    if (result.success) {
      dirtyRef.current = false;
      setDraft(result.task.completionEvidence || "");
      setFieldStatus("Saved");
      setFieldError("");
    } else {
      setFieldStatus("Failed");
      setFieldError(result.message);
    }
  };

  return (
    <div className="task-evidence-cell">
      <input
        type="text"
        inputMode="url"
        aria-label={`Evidence link for ${data.title}`}
        value={draft}
        placeholder={data.evidenceRequired ? "Required evidence link" : "Optional evidence link"}
        onFocus={() => {
          editingRef.current = true;
          context.setEvidenceEditing(data._id, true);
        }}
        onChange={(event) => {
          dirtyRef.current = true;
          setDraft(event.target.value);
          setFieldStatus("");
          setFieldError("");
        }}
        onBlur={() => { void saveDraft(); }}
        aria-invalid={Boolean(fieldError)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
      <small className={fieldError ? "task-evidence-error" : "task-evidence-status"}>
        {fieldError || fieldStatus}
      </small>
    </div>
  );
};

const TaskActionsCell = (params) => {
  const { data, context } = params;
  const taskError = context.getTaskError(data._id);
  if (data.status !== "IN_PROGRESS") {
    return taskError ? <span className="task-inline-error" role="alert">{taskError}</span> : null;
  }
  return (
    <div className="task-action-cell">
      <Button
        size="sm"
        variant="secondary"
        disabled={context.isTaskSaving(data._id)}
        onClick={() => context.openCompletion(data)}
      >
        Mark completed
      </Button>
      {taskError && <span className="task-inline-error" role="alert">{taskError}</span>}
    </div>
  );
};

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
  const [lastImport, setLastImport] = useState(null);
  const [importStep, setImportStep] = useState(1);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [draggingFile, setDraggingFile] = useState(false);
  const [assignValidOnly, setAssignValidOnly] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [quickSearch, setQuickSearch] = useState("");
  const [evidenceCompletionTask, setEvidenceCompletionTask] = useState(null);
  const [completionEvidenceDraft, setCompletionEvidenceDraft] = useState("");
  const [completionError, setCompletionError] = useState("");
  const [savingTaskIds, setSavingTaskIds] = useState({});
  const [taskErrors, setTaskErrors] = useState({});
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
  const tasksRef = useRef([]);
  const editingEvidenceRef = useRef(new Set());
  const savingTaskIdsRef = useRef(new Set());
  const taskErrorsRef = useRef({});
  const gridApiRef = useRef(null);

  const replaceTask = useCallback((serverTask) => {
    const updatedTask = gridTask(serverTask);
    const nextTasks = tasksRef.current.map((task) => (
      task._id === updatedTask._id ? updatedTask : task
    ));
    tasksRef.current = nextTasks;
    setTasks(nextTasks);
    return updatedTask;
  }, []);

  const setTaskSaving = useCallback((taskId, saving) => {
    if (saving) savingTaskIdsRef.current.add(taskId);
    else savingTaskIdsRef.current.delete(taskId);
    setSavingTaskIds((current) => ({ ...current, [taskId]: saving }));
    gridApiRef.current?.refreshCells({ columns: ["taskActions"], force: true });
  }, []);

  const setTaskError = useCallback((taskId, message) => {
    const next = { ...taskErrorsRef.current };
    if (message) next[taskId] = message;
    else delete next[taskId];
    taskErrorsRef.current = next;
    setTaskErrors(next);
    gridApiRef.current?.refreshCells({ columns: ["taskActions"], force: true });
  }, []);

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
      const currentTasks = new Map(tasksRef.current.map((task) => [task._id, task]));
      const nextTasks = (taskResponse?.tasks || []).map((serverTask) => {
        const nextTask = gridTask(serverTask);
        const currentTask = currentTasks.get(nextTask._id);
        if (currentTask && (
          savingTaskIdsRef.current.has(nextTask._id)
          || currentTask.version > nextTask.version
        )) return currentTask;
        if (editingEvidenceRef.current.has(nextTask._id) && currentTask) {
          return {
            ...nextTask,
            completionEvidence: currentTask.completionEvidence,
          };
        }
        return nextTask;
      });
      tasksRef.current = nextTasks;
      setTasks(nextTasks);
      setSummary(summaryResponse?.summary || null);
      setError("");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

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
    const currentTask = tasksRef.current.find((task) => task._id === data._id) || data;
    const payload = { version: currentTask.version };
    if (field === "assignedToId") payload.assignedTo = newValue;
    else if (field === "deadline") payload.deadline = newValue || null;
    else if (["title", "priority", "status"].includes(field)) {
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

    setTaskSaving(data._id, true);
    setTaskError(data._id, "");
    setNotice("Saving...");
    try {
      const response = await updateTeamTask(teamId, data._id, payload);
      const savedTask = replaceTask(response.task);
      node.setData(savedTask);
      setNotice("Saved ✓");
      try {
        const summaryResponse = await getTeamTaskSummary(teamId);
        setSummary(summaryResponse?.summary || null);
      } catch (summaryError) {
        setError(`Task saved, but progress could not be refreshed: ${errorMessage(summaryError)}`);
      }
    } catch (requestError) {
      node.setDataValue(field, oldValue);
      const message = errorMessage(requestError);
      setTaskError(data._id, message);
      setNotice(`Failed — Reverted. ${message}`);
    } finally {
      setTaskSaving(data._id, false);
    }
  }, [replaceTask, setTaskError, setTaskSaving, teamId]);

  const saveEvidence = useCallback(async (taskId, completionEvidence) => {
    const currentTask = tasksRef.current.find((task) => task._id === taskId);
    if (!currentTask) return { success: false, message: "Task is no longer available." };
    setTaskSaving(taskId, true);
    setTaskError(taskId, "");
    try {
      const response = await updateTeamTask(teamId, taskId, {
        version: currentTask.version,
        completionEvidence,
      });
      const savedTask = replaceTask(response.task);
      return { success: true, task: savedTask };
    } catch (requestError) {
      const message = errorMessage(requestError);
      setTaskError(taskId, message);
      return { success: false, message };
    } finally {
      setTaskSaving(taskId, false);
    }
  }, [replaceTask, setTaskError, setTaskSaving, teamId]);

  const setEvidenceEditing = useCallback((taskId, editing) => {
    if (editing) editingEvidenceRef.current.add(taskId);
    else editingEvidenceRef.current.delete(taskId);
  }, []);

  const openCompletion = useCallback((task) => {
    if (savingTaskIdsRef.current.has(task._id)) return;
    const currentTask = tasksRef.current.find((entry) => entry._id === task._id) || task;
    setTaskError(task._id, "");
    setEvidenceCompletionTask(currentTask);
    setCompletionEvidenceDraft(currentTask.completionEvidence || "");
    setCompletionError("");
  }, [setTaskError]);

  const submitCompletion = async (event) => {
    event.preventDefault();
    if (!evidenceCompletionTask) return;
    const taskId = evidenceCompletionTask._id;
    const currentTask = tasksRef.current.find((task) => task._id === taskId) || evidenceCompletionTask;
    const evidence = completionEvidenceDraft.trim();
    const validationMessage = validateEvidenceUrl(evidence);
    if (validationMessage) {
      setCompletionError(validationMessage);
      return;
    }
    if (currentTask.evidenceRequired && !evidence) {
      setCompletionError("Add a valid evidence link before completing this task.");
      return;
    }

    setCompletionError("");
    setTaskError(taskId, "");
    setTaskSaving(taskId, true);
    const originalStatus = currentTask.status;
    const optimisticTask = { ...currentTask, status: "COMPLETED" };
    tasksRef.current = tasksRef.current.map((task) => task._id === taskId ? optimisticTask : task);
    setTasks(tasksRef.current);
    try {
      const response = await updateTeamTask(teamId, taskId, {
        status: "COMPLETED",
        completionEvidence: evidence,
        version: currentTask.version,
      });
      replaceTask(response.task);
      setEvidenceCompletionTask(null);
      setNotice("Task completed.");
      try {
        const summaryResponse = await getTeamTaskSummary(teamId);
        setSummary(summaryResponse?.summary || null);
      } catch (summaryError) {
        setError(`Task completed, but progress could not be refreshed: ${errorMessage(summaryError)}`);
      }
    } catch (requestError) {
      const message = errorMessage(requestError);
      tasksRef.current = tasksRef.current.map((task) => (
        task._id === taskId ? { ...task, status: originalStatus } : task
      ));
      setTasks(tasksRef.current);
      setTaskError(taskId, message);
      setCompletionError(message);
    } finally {
      setTaskSaving(taskId, false);
    }
  };

  const taskGridContext = useMemo(() => ({
    saveEvidence,
    setEvidenceEditing,
    openCompletion,
    isTaskSaving: (taskId) => savingTaskIdsRef.current.has(taskId),
    getTaskError: (taskId) => taskErrorsRef.current[taskId] || "",
  }), [openCompletion, saveEvidence, setEvidenceEditing]);

  const columnDefs = useMemo(() => [
    {
      headerName: "Employee",
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
      sort: "asc",
      sortIndex: 0,
      editable: isFounder,
      cellEditor: "agTextCellEditor",
      valueFormatter: (params) => params.value
        ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(`${params.value}T00:00:00`))
        : "—",
    },
    {
      headerName: "Priority",
      field: "priority",
      minWidth: 120,
      editable: isFounder,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: { values: PRIORITIES },
    },
    {
      headerName: "Evidence",
      field: "completionEvidence",
      minWidth: 280,
      editable: false,
      cellRenderer: isFounder ? (params) => params.value
        ? <a href={params.value} target="_blank" rel="noreferrer">View evidence</a>
        : params.data.evidenceRequired ? "Required" : "—" : EvidenceCell,
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
            ? ["IN_PROGRESS", "SKIPPED", "BLOCKED"]
            : status === "BLOCKED"
              ? ["BLOCKED", "IN_PROGRESS"]
              : status === "SKIPPED"
                ? ["SKIPPED", "TODO"]
                : [status];
        return { values: options };
      },
      valueFormatter: (params) => formatStatus(params.value),
    },
    ...(!isFounder ? [{
      headerName: "Action",
      colId: "taskActions",
      minWidth: 180,
      sortable: false,
      filter: false,
      cellRenderer: TaskActionsCell,
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
    setAssignValidOnly(true);
    setNotice("");
    setError("");
    try {
      setPreview(await previewTeamTaskImport(teamId, file));
      setImportStep(2);
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
      const rows = assignValidOnly
        ? preview.rows.filter((row) => row.status === "valid")
        : preview.rows;
      const response = await commitTeamTaskImport(teamId, {
        previewId: preview.previewId,
        fileName: preview.fileName,
        rows,
      });
      const createdCount = response.counts?.createdCount ?? response.batch?.createdCount ?? 0;
      setLastImport({
        batchId: response.batch?._id,
      });
      setNotice(`${createdCount} tasks assigned.`);
      setPreview(null);
      setShowImportWizard(false);
      setImportStep(1);
      await loadWorkspace();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const undoImport = async () => {
    if (!lastImport?.batchId) return;
    setBusy(true);
    setError("");
    try {
      const response = await undoTeamTaskImport(teamId, lastImport.batchId);
      setNotice(`Import undone. ${response.deletedCount} pending tasks removed; ${response.retainedCount} started or completed tasks kept.`);
      setLastImport(null);
      await loadWorkspace();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDraggingFile(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    void previewFile({ target: { files: [file], value: "" } });
  };

  const filteredTasks = useMemo(() => tasks.filter((task) => (
    (!employeeFilter || task.assignedToId === employeeFilter)
    && (!statusFilter || task.status === statusFilter)
  )), [employeeFilter, statusFilter, tasks]);

  const employeeSummary = useMemo(() => summary?.employees || [], [summary]);
  const overall = summary?.overall || {};
  const totals = useMemo(() => employeeSummary.reduce((counts, employee) => ({
    total: counts.total + (employee.total || 0),
    inProgress: counts.inProgress + (employee.inProgress || 0),
    completed: counts.completed + (employee.completed || 0),
    skipped: counts.skipped + (employee.skipped || 0),
    overdue: counts.overdue + (employee.overdue || 0),
  }), { total: 0, inProgress: 0, completed: 0, skipped: 0, overdue: 0 }), [employeeSummary]);

  const focusEmployee = (employeeId) => {
    setEmployeeFilter(employeeId);
    setActiveTab("tasks");
  };

  const previewColumnDefs = useMemo(() => [
    { headerName: "Employee", field: "employee.name", minWidth: 170 },
    { headerName: "Task", field: "task.title", minWidth: 220, flex: 1 },
    {
      headerName: "Deadline",
      field: "task.deadline",
      minWidth: 140,
      valueFormatter: (params) => params.value
        ? new Date(params.value).toLocaleDateString()
        : "—",
    },
    { headerName: "Priority", field: "task.priority", minWidth: 110 },
    {
      headerName: "Result",
      field: "status",
      minWidth: 240,
      flex: 1,
      cellRenderer: (params) => (
        <div className="task-preview-result">
          <span className={`task-status-chip ${params.value === "valid" ? "task-status-valid" : "task-status-invalid"}`}>
            {params.value === "valid" ? "Valid" : "Needs fixing"}
          </span>
          {params.data.reason && <small>{params.data.reason}</small>}
          {params.data.warnings?.map((warning) => <small className="task-warning" key={warning}>{warning}</small>)}
        </div>
      ),
    },
  ], []);

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
                <Button onClick={() => {
                  setShowImportWizard(true);
                  setImportStep(1);
                  setPreview(null);
                  setAssignValidOnly(true);
                }}>
                  <Upload size={16} /> Import from Excel
                </Button>
                <Button onClick={() => setShowCreateForm((shown) => !shown)}>
                  <Plus size={16} /> Add task
                </Button>
              </>
            )}
          </div>
        </header>

        {error && <Card><p className="task-message task-message-error" role="alert">{error}</p></Card>}
        {notice && <p className={`task-toast${notice.startsWith("Failed") ? " task-toast-error" : ""}`} role="status">{notice}</p>}
        {lastImport?.batchId && (
          <Card className="task-undo-notice">
            <span>Need to revert this import?</span>
            <Button variant="secondary" onClick={() => void undoImport()} disabled={busy}>
              Undo import
            </Button>
          </Card>
        )}

        {loading && !summary ? (
          <Card><p role="status">Loading task progress…</p></Card>
        ) : error && !summary ? (
          <Card><p className="task-message task-message-error">Progress summary is unavailable.</p></Card>
        ) : isFounder && summary ? (
          <>
            <section className="task-summary-grid task-summary-metrics" aria-label="Team task progress">
              {[
                ["Total", totals.total],
                ["In progress", totals.inProgress],
                ["Completed", totals.completed],
                ["Skipped", totals.skipped],
                ["Overdue", totals.overdue],
              ].map(([label, count]) => (
                <Card className="task-summary-metric" key={label}>
                  <span>{label}</span>
                  <strong>{count}</strong>
                </Card>
              ))}
            </section>
            <Card className="task-overall-progress">
              <div><strong>Overall completion</strong><span>{overall.completionPercent || 0}%</span></div>
              <div className="task-progress-track" role="progressbar" aria-valuenow={overall.completionPercent || 0} aria-valuemin="0" aria-valuemax="100">
                <span style={{ width: `${overall.completionPercent || 0}%` }} />
              </div>
              <small>{overall.completed || 0} of {overall.total || 0} tasks completed</small>
            </Card>
          </>
        ) : summary ? (
          <Card className="task-summary-overall">
            <span>Your progress</span>
            <strong>{overall.completionPercent || 0}%</strong>
            <div className="task-progress-track" role="progressbar" aria-valuenow={overall.completionPercent || 0} aria-valuemin="0" aria-valuemax="100">
              <span style={{ width: `${overall.completionPercent || 0}%` }} />
            </div>
            <small>{overall.completed || 0} of {overall.total || 0} tasks completed</small>
          </Card>
        ) : null}

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

        {showImportWizard && isFounder && (
          <Card className="task-import-preview">
            <div className="task-import-heading">
              <div>
                <span className="eyebrow">Bulk assignment · Step {importStep} of 3</span>
                <h2>{importStep === 1 ? "Upload your task sheet" : importStep === 2 ? "Review import preview" : "Assign tasks"}</h2>
                {preview && <p>{preview.fileName} · {preview.createdCount} valid, {preview.skippedCount} need fixing</p>}
              </div>
              <div className="task-workspace-actions">
                <Button variant="secondary" onClick={() => {
                  setShowImportWizard(false);
                  setPreview(null);
                  setImportStep(1);
                }}>Close</Button>
              </div>
            </div>
            <ol className="task-import-steps">
              <li className={importStep >= 1 ? "active" : ""}>Upload</li>
              <li className={importStep >= 2 ? "active" : ""}>Preview</li>
              <li className={importStep >= 3 ? "active" : ""}>Assign</li>
            </ol>
            {importStep === 1 && (
              <div className="task-import-step">
                <Button variant="secondary" onClick={downloadTemplate}>
                  <ArrowDownToLine size={16} /> Download template
                </Button>
                <div
                  className={`task-dropzone${draggingFile ? " task-dropzone-active" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDraggingFile(true);
                  }}
                  onDragLeave={() => setDraggingFile(false)}
                  onDrop={handleDrop}
                >
                  <FileSpreadsheet size={28} aria-hidden="true" />
                  <strong>Drop an Excel or CSV file here</strong>
                  <span>or choose a file from your device (up to 5 MB)</span>
                  <label className="button button-primary task-upload-button">
                    <Upload size={16} /> {busy ? "Checking file…" : "Choose file"}
                    <input type="file" accept=".xlsx,.csv" onChange={previewFile} disabled={busy} />
                  </label>
                </div>
              </div>
            )}
            {importStep === 2 && preview && (
              <>
                <div className="task-import-counts" role="status">
                  <span className="task-count-valid"><Check size={16} /> {preview.createdCount} valid</span>
                  <span className={preview.skippedCount ? "task-count-invalid" : "task-count-valid"}>
                    {preview.skippedCount} need fixing
                  </span>
                </div>
                <div className="ag-theme-quartz task-preview-grid">
                  <AgGridReact
                    theme={taskTheme}
                    rowData={preview.rows}
                    columnDefs={previewColumnDefs}
                    defaultColDef={{ resizable: true, sortable: true, filter: true }}
                    getRowId={(params) => String(params.data.rowNumber)}
                    pagination
                    paginationPageSize={15}
                    overlayNoRowsTemplate="No rows found in this file."
                  />
                </div>
                <div className="task-import-footer">
                  <Button variant="secondary" onClick={() => {
                    setPreview(null);
                    setImportStep(1);
                  }}>Choose another file</Button>
                  <Button onClick={() => setImportStep(3)} disabled={preview.createdCount === 0}>
                    Continue to assignment
                  </Button>
                </div>
              </>
            )}
            {importStep === 3 && preview && (
              <div className="task-import-step">
                <p>Ready to assign <strong>{preview.createdCount} tasks</strong> to your team.</p>
                {preview.skippedCount > 0 && (
                  <label className="task-checkbox-label">
                    <input
                      type="checkbox"
                      checked={assignValidOnly}
                      onChange={(event) => setAssignValidOnly(event.target.checked)}
                    />
                    Assign valid rows only; keep invalid rows out of this import
                  </label>
                )}
                <p className="task-message">
                  {preview.skippedCount
                    ? `${preview.skippedCount} invalid rows will not create tasks.`
                    : "All rows passed validation."}
                </p>
                <div className="task-import-footer">
                  <Button variant="secondary" onClick={() => setImportStep(2)}>Back to preview</Button>
                  <Button onClick={commitPreview} disabled={busy || preview.createdCount === 0}>
                    {busy ? "Assigning…" : `Assign ${preview.createdCount} tasks`}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {isFounder && (
          <nav className="task-view-tabs" aria-label="Task views">
            <button type="button" className={activeTab === "tasks" ? "active" : ""} onClick={() => setActiveTab("tasks")}>Tasks</button>
            <button type="button" className={activeTab === "employees" ? "active" : ""} onClick={() => setActiveTab("employees")}>Per-employee</button>
          </nav>
        )}

        {activeTab === "employees" && isFounder ? (
          loading && !summary ? <Card><p role="status">Loading employee progress…</p></Card>
            : error && !summary ? <Card><p className="task-message task-message-error" role="alert">Employee progress is unavailable.</p></Card>
              : employeeSummary.length === 0 ? <Card className="empty-state"><h2>No employees yet</h2><p>Add team members to review their task progress here.</p></Card>
                : <section className="task-employee-grid" aria-label="Per-employee task progress">
                  {employeeSummary.map((employee) => {
                    const percent = employee.total ? Math.round((employee.completed / employee.total) * 100) : 0;
                    return (
                      <Card className="task-employee-card" key={employee.userId}>
                        <div className="task-employee-heading">
                          <div><h2>{employee.name || "Team member"}</h2><span>{employee.total} tasks</span></div>
                          {employee.overdue > 0 && <span className="task-overdue-badge">{employee.overdue} overdue</span>}
                        </div>
                        <div className="task-progress-track" role="progressbar" aria-label={`${employee.name} completion`} aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100">
                          <span style={{ width: `${percent}%` }} />
                        </div>
                        <strong>{percent}% completed</strong>
                        <small>{employee.todo || 0} to do · {employee.inProgress || 0} in progress · {employee.completed || 0} completed · {employee.skipped || 0} skipped</small>
                        <Button variant="secondary" onClick={() => focusEmployee(employee.userId)}>View tasks</Button>
                      </Card>
                    );
                  })}
                </section>
        ) : (
          <Card className="task-grid-card">
            <div className="task-grid-heading">
              <div><h2>{isFounder ? "Team tasks" : "Assigned to me"}</h2><p>{isFounder ? "Changes save to MongoDB as you edit." : "Update status and add completion evidence in the grid."}</p></div>
              <span>{filteredTasks.length} tasks</span>
            </div>
            <div className="task-grid-filters">
              <label>Search tasks<input type="search" value={quickSearch} onChange={(event) => setQuickSearch(event.target.value)} placeholder="Search title or description" /></label>
              {isFounder && (
                <label>Employee<select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}>
                  <option value="">All employees</option>
                  {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name || "Team member"}</option>)}
                </select></label>
              )}
              <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All statuses</option>
                {STATUSES.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
              </select></label>
              {(employeeFilter || statusFilter) && <Button variant="secondary" onClick={() => {
                setEmployeeFilter("");
                setStatusFilter("");
              }}>Clear filters</Button>}
            </div>
            {loading ? <p role="status">Loading tasks…</p>
              : error && tasks.length === 0 ? <div className="task-section-error" role="alert"><p>Unable to load tasks.</p><Button variant="secondary" onClick={() => void loadWorkspace(true)}>Retry</Button></div>
                : filteredTasks.length === 0 ? <div className="task-empty-state"><h3>{tasks.length ? "No tasks match these filters" : "No tasks yet"}</h3><p>{tasks.length ? "Change or clear the filters to see other tasks." : isFounder ? "Add a task or import a sheet to get started." : "You have no assigned tasks yet."}</p></div>
                  : <div className="ag-theme-quartz task-grid">
                    <AgGridReact
                      theme={taskTheme}
                      rowData={filteredTasks}
                      columnDefs={columnDefs}
                      context={taskGridContext}
                      defaultColDef={{ resizable: true, sortable: true, filter: true, editable: false }}
                      getRowId={(params) => params.data._id}
                      onGridReady={(event) => { gridApiRef.current = event.api; }}
                      onCellValueChanged={saveGridChange}
                      quickFilterText={quickSearch}
                      pagination
                      paginationPageSize={20}
                      singleClickEdit
                      stopEditingWhenCellsLoseFocus
                      overlayNoRowsTemplate="No tasks match your search."
                    />
                  </div>}
          </Card>
        )}
        {evidenceCompletionTask && (
          <div className="task-modal-backdrop" role="presentation">
            <section
              className="task-completion-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="task-completion-title"
            >
              <h2 id="task-completion-title">Complete task</h2>
              <p>{evidenceCompletionTask.title}</p>
              <form onSubmit={submitCompletion}>
                <label htmlFor="completion-evidence">
                  Evidence link{evidenceCompletionTask.evidenceRequired ? " (required)" : " (optional)"}
                </label>
                <input
                  id="completion-evidence"
                  type="text"
                  inputMode="url"
                  value={completionEvidenceDraft}
                  required={evidenceCompletionTask.evidenceRequired}
                  placeholder="https://"
                  onChange={(event) => {
                    setCompletionEvidenceDraft(event.target.value);
                    setCompletionError("");
                  }}
                  aria-invalid={Boolean(completionError)}
                />
                {(completionError || taskErrors[evidenceCompletionTask._id]) && (
                  <p className="task-evidence-error" role="alert">
                    {completionError || taskErrors[evidenceCompletionTask._id]}
                  </p>
                )}
                <div className="task-modal-actions">
                  <Button
                    variant="secondary"
                    disabled={savingTaskIds[evidenceCompletionTask._id] === true}
                    onClick={() => setEvidenceCompletionTask(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingTaskIds[evidenceCompletionTask._id] === true}>
                    {savingTaskIds[evidenceCompletionTask._id] ? "Saving..." : "Mark completed"}
                  </Button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </AppLayout>
  );
};

export default TeamTasksPage;
export { EvidenceCell };
