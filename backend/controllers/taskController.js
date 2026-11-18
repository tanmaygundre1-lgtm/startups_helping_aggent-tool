const crypto = require('crypto');
const path = require('path');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const { Readable } = require('stream');
const Task = require('../models/Task');
const TaskActivity = require('../models/TaskActivity');
const TaskImportBatch = require('../models/TaskImportBatch');
const Team = require('../models/Team');
const User = require('../models/User');

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'SKIPPED', 'BLOCKED'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const REQUIRE_FOUNDER_REVIEW = false;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 500;
const importAttempts = new Map();

const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);
const asId = (value) => String(value?._id || value || '');
const responseError = (res, status, message, code) => res.status(status).json({
  success: false,
  message,
  code,
});

const sanitizeText = (value, maxLength) => {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .replace(/^[=+\-@]+/, '')
    .trim()
    .slice(0, maxLength);
};

const validateHttpUrl = (value) => {
  if (!value) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const getContext = async (req, res) => {
  const { teamId } = req.params;
  if (!isValidId(teamId)) {
    responseError(res, 400, 'Invalid team ID format', 'INVALID_ID');
    return null;
  }

  const user = await User.findOne({ firebaseUid: req.user.uid }).lean();
  if (!user) {
    responseError(res, 401, 'User profile not found', 'USER_NOT_FOUND');
    return null;
  }

  const team = await Team.findById(teamId).lean();
  if (!team) {
    responseError(res, 404, 'Team not found', 'TEAM_NOT_FOUND');
    return null;
  }

  const isFounder = asId(team.founderId) === asId(user._id);
  const isMember = (team.members || []).some((member) => asId(member.userId) === asId(user._id));
  if (!isFounder && !isMember) {
    responseError(res, 403, 'You are not a member of this team', 'FORBIDDEN');
    return null;
  }

  return { team, user, isFounder };
};

const teamUserIds = (team) => [
  asId(team.founderId),
  ...(team.members || []).map((member) => asId(member.userId)),
].filter(Boolean);

const getEligibleUsers = async (team) => User.find({ _id: { $in: teamUserIds(team) } })
  .select('_id name email profileType')
  .lean();

const normalizeDeadline = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const dayFirst = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dayFirst) {
    const [, dayText, monthText, yearText] = dayFirst;
    const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
    if (date.getFullYear() !== Number(yearText)
      || date.getMonth() !== Number(monthText) - 1
      || date.getDate() !== Number(dayText)) return null;
    return date;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const countActiveWorkload = async (teamId, eligibleUsers) => {
  const workload = await Task.aggregate([
    {
      $match: {
        teamId: new mongoose.Types.ObjectId(teamId),
        assignedTo: { $in: eligibleUsers.map((user) => user._id) },
        status: { $nin: ['COMPLETED', 'SKIPPED'] },
      },
    },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
  ]);
  return new Map(workload.map((entry) => [asId(entry._id), entry.count]));
};

const selectAssignee = async (team, assignedTo) => {
  const eligibleUsers = await getEligibleUsers(team);
  if (assignedTo) {
    if (!isValidId(assignedTo)) return { error: 'Invalid assignee ID', code: 'INVALID_ASSIGNEE' };
    const user = eligibleUsers.find((candidate) => asId(candidate._id) === asId(assignedTo));
    return user
      ? { user }
      : { error: 'Assignee must belong to this team', code: 'INVALID_ASSIGNEE' };
  }
  if (!eligibleUsers.length) {
    return { error: 'No eligible team member is available for assignment', code: 'NO_ELIGIBLE_ASSIGNEE' };
  }

  const workload = await countActiveWorkload(team._id, eligibleUsers);
  eligibleUsers.sort((first, second) => (
    (workload.get(asId(first._id)) || 0) - (workload.get(asId(second._id)) || 0)
    || asId(first._id).localeCompare(asId(second._id))
  ));
  return { user: eligibleUsers[0] };
};

const recordActivities = async (task, userId, changes) => {
  if (!changes.length) return;
  await TaskActivity.insertMany(changes.map((change) => ({
    taskId: task._id,
    teamId: task.teamId,
    userId,
    ...change,
  })));
};

const populateTask = (query) => query
  .populate('assignedTo', 'name email')
  .populate('createdBy', 'name')
  .populate('updatedBy', 'name')
  .lean();

const validateTaskFields = (body, { creating = false } = {}) => {
  const title = sanitizeText(body.title, 200);
  const rawTitle = typeof body.title === 'string' ? sanitizeText(body.title, 5000) : '';
  if (creating && (rawTitle.length < 2 || rawTitle.length > 200)) {
    return { error: 'Task title must be between 2 and 200 characters', code: 'INVALID_TITLE' };
  }
  if (!creating && body.title !== undefined && (rawTitle.length < 2 || rawTitle.length > 200)) {
    return { error: 'Task title must be between 2 and 200 characters', code: 'INVALID_TITLE' };
  }
  const description = body.description === undefined
    ? undefined
    : sanitizeText(body.description, 4000);
  if (body.description !== undefined && typeof body.description !== 'string') {
    return { error: 'Task description must be text', code: 'INVALID_DESCRIPTION' };
  }
  const deadline = body.deadline === undefined ? undefined : normalizeDeadline(body.deadline);
  if (body.deadline !== undefined && body.deadline !== null && body.deadline !== '' && !deadline) {
    return { error: 'Deadline must be a valid date', code: 'INVALID_DEADLINE' };
  }
  const priority = body.priority === undefined ? undefined : body.priority;
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    return { error: 'Priority must be Low, Medium, or High', code: 'INVALID_PRIORITY' };
  }
  const evidenceRequired = body.evidenceRequired === undefined ? undefined : body.evidenceRequired;
  if (evidenceRequired !== undefined && typeof evidenceRequired !== 'boolean') {
    return { error: 'evidenceRequired must be a boolean', code: 'INVALID_EVIDENCE_REQUIRED' };
  }
  return {
    values: {
      ...(body.title !== undefined || creating ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(body.deadline !== undefined ? { deadline } : {}),
      ...(priority !== undefined ? { priority } : {}),
      ...(evidenceRequired !== undefined ? { evidenceRequired } : {}),
    },
  };
};

const createTask = async (req, res) => {
  try {
    const context = await getContext(req, res);
    if (!context) return;
    if (!context.isFounder) return responseError(res, 403, 'Only the team founder can create tasks', 'FOUNDER_REQUIRED');

    const allowed = ['title', 'description', 'deadline', 'priority', 'assignedTo', 'evidenceRequired'];
    if (Object.keys(req.body || {}).some((key) => !allowed.includes(key))) {
      return responseError(res, 400, 'Task contains unsupported fields', 'INVALID_FIELDS');
    }
    const validated = validateTaskFields(req.body || {}, { creating: true });
    if (validated.error) return responseError(res, 400, validated.error, validated.code);

    const assignment = await selectAssignee(context.team, req.body.assignedTo);
    if (assignment.error) return responseError(res, 400, assignment.error, assignment.code);

    const task = await Task.create({
      ...validated.values,
      teamId: context.team._id,
      ideaId: context.team.ideaId,
      assignedTo: assignment.user._id,
      createdBy: context.user._id,
      updatedBy: context.user._id,
    });
    try {
      await recordActivities(task, context.user._id, [
        { type: 'created', field: '', oldValue: null, newValue: task.title },
        { type: 'reassigned', field: 'assignedTo', oldValue: null, newValue: assignment.user._id },
      ]);
    } catch (activityError) {
      await Task.deleteOne({ _id: task._id });
      throw activityError;
    }

    const savedTask = await populateTask(Task.findById(task._id));
    return res.status(201).json({ success: true, message: 'Task created', task: savedTask });
  } catch (error) {
    console.error('[ERROR] POST /teams/:teamId/tasks:', error.message);
    return responseError(res, 500, 'Failed to create task', 'TASK_CREATE_FAILED');
  }
};

const listTasks = async (req, res) => {
  try {
    const context = await getContext(req, res);
    if (!context) return;
    const filter = { teamId: context.team._id };
    if (!context.isFounder) {
      if (req.query.assignedTo && req.query.assignedTo !== 'me'
        && asId(req.query.assignedTo) !== asId(context.user._id)) {
        return responseError(res, 403, 'Team members can only view their own tasks', 'FORBIDDEN');
      }
      filter.assignedTo = context.user._id;
    } else if (req.query.assignedTo) {
      const assignee = req.query.assignedTo === 'me'
        ? asId(context.user._id)
        : req.query.assignedTo;
      if (!isValidId(assignee) || !teamUserIds(context.team).includes(asId(assignee))) {
        return responseError(res, 400, 'Assignee must belong to this team', 'INVALID_ASSIGNEE');
      }
      filter.assignedTo = assignee;
    }
    if (req.query.status) {
      if (!STATUSES.includes(req.query.status)) {
        return responseError(res, 400, 'Invalid task status', 'INVALID_STATUS');
      }
      filter.status = req.query.status;
    }

    const tasks = await populateTask(Task.find(filter).sort({ deadline: 1, createdAt: -1 }));
    return res.status(200).json({ success: true, tasks });
  } catch (error) {
    console.error('[ERROR] GET /teams/:teamId/tasks:', error.message);
    return responseError(res, 500, 'Failed to fetch team tasks', 'TASK_READ_FAILED');
  }
};

const getTaskSummary = async (req, res) => {
  try {
    const context = await getContext(req, res);
    if (!context) return;
    const filter = { teamId: context.team._id };
    if (!context.isFounder) filter.assignedTo = context.user._id;

    const tasks = await Task.find(filter).select('assignedTo status deadline').lean();
    const users = context.isFounder ? await getEligibleUsers(context.team) : [context.user];
    const byEmployee = new Map(users.map((user) => [asId(user._id), {
      userId: asId(user._id),
      name: user.name,
      email: user.email,
      total: 0,
      todo: 0,
      inProgress: 0,
      completed: 0,
      skipped: 0,
      overdue: 0,
    }]));
    const now = new Date();
    tasks.forEach((task) => {
      const entry = byEmployee.get(asId(task.assignedTo));
      if (!entry) return;
      entry.total += 1;
      if (task.status === 'TODO') entry.todo += 1;
      if (['IN_PROGRESS', 'IN_REVIEW', 'BLOCKED'].includes(task.status)) entry.inProgress += 1;
      if (task.status === 'COMPLETED') entry.completed += 1;
      if (task.status === 'SKIPPED') entry.skipped += 1;
      if (task.deadline && task.deadline < now && !['COMPLETED', 'SKIPPED'].includes(task.status)) {
        entry.overdue += 1;
      }
    });
    const employees = [...byEmployee.values()];
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === 'COMPLETED').length;
    return res.status(200).json({
      success: true,
      summary: {
        employees,
        overall: {
          total,
          completed,
          completionPercent: total ? Math.round((completed / total) * 100) : 0,
        },
      },
    });
  } catch (error) {
    console.error('[ERROR] GET /teams/:teamId/tasks/summary:', error.message);
    return responseError(res, 500, 'Failed to calculate task summary', 'TASK_SUMMARY_FAILED');
  }
};

const getTaskTemplate = async (req, res) => {
  try {
    const context = await getContext(req, res);
    if (!context) return;
    const users = await getEligibleUsers(context.team);
    const workbook = new ExcelJS.Workbook();
    const tasksSheet = workbook.addWorksheet('Tasks');
    tasksSheet.addRow([
      'Employee Email',
      'Employee Name',
      'Task Title',
      'Description',
      'Deadline',
      'Priority',
      'Evidence Required',
    ]);
    tasksSheet.addRow([
      'employee@example.com',
      'Employee Name',
      'Build the login API',
      'Implement and test the login endpoint',
      '31-12-2030',
      'Medium',
      'Yes',
    ]);
    tasksSheet.getRow(1).font = { bold: true };
    tasksSheet.columns = [
      { width: 30 }, { width: 26 }, { width: 32 }, { width: 48 },
      { width: 18 }, { width: 14 }, { width: 20 },
    ];
    const membersSheet = workbook.addWorksheet('Team members');
    membersSheet.addRow(['Employee Name', 'Employee Email']);
    users.forEach((user) => membersSheet.addRow([
      sanitizeText(user.name, 200),
      sanitizeText(user.email, 254),
    ]));
    membersSheet.getRow(1).font = { bold: true };
    membersSheet.columns = [{ width: 32 }, { width: 42 }];

    const buffer = await workbook.xlsx.writeBuffer();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="team-${context.team._id}-tasks-template.xlsx"`,
    });
    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.error('[ERROR] GET /teams/:teamId/tasks/template:', error.message);
    return responseError(res, 500, 'Failed to create task template', 'TASK_TEMPLATE_FAILED');
  }
};

const applyStatusTransition = (currentStatus, newStatus, isFounder) => {
  if (!STATUSES.includes(newStatus)) return false;
  if (isFounder) {
    if (REQUIRE_FOUNDER_REVIEW && newStatus === 'COMPLETED') return currentStatus === 'IN_REVIEW';
    return false;
  }
  if (REQUIRE_FOUNDER_REVIEW) {
    return (currentStatus === 'TODO' && ['IN_PROGRESS', 'SKIPPED'].includes(newStatus))
      || (currentStatus === 'IN_PROGRESS' && ['IN_REVIEW', 'SKIPPED', 'BLOCKED'].includes(newStatus))
      || (currentStatus === 'BLOCKED' && newStatus === 'IN_PROGRESS')
      || (currentStatus === 'SKIPPED' && newStatus === 'TODO');
  }
  return (currentStatus === 'TODO' && ['IN_PROGRESS', 'SKIPPED'].includes(newStatus))
    || (currentStatus === 'IN_PROGRESS' && ['COMPLETED', 'SKIPPED', 'BLOCKED'].includes(newStatus))
    || (currentStatus === 'BLOCKED' && newStatus === 'IN_PROGRESS')
    || (currentStatus === 'SKIPPED' && newStatus === 'TODO');
};

const updateTask = async (req, res) => {
  try {
    const context = await getContext(req, res);
    if (!context) return;
    const { taskId } = req.params;
    if (!isValidId(taskId)) return responseError(res, 400, 'Invalid task ID format', 'INVALID_ID');
    const task = await Task.findOne({ _id: taskId, teamId: context.team._id });
    if (!task) return responseError(res, 404, 'Task not found', 'TASK_NOT_FOUND');
    if (!context.isFounder && asId(task.assignedTo) !== asId(context.user._id)) {
      return responseError(res, 403, 'You can only update tasks assigned to you', 'FORBIDDEN');
    }

    const body = req.body || {};
    if (!Number.isInteger(body.version) || body.version < 0) {
      return responseError(res, 400, 'A valid task version is required', 'INVALID_VERSION');
    }
    if (body.version !== task.version) {
      return responseError(res, 409, 'This task has changed. Refresh and try again.', 'STALE_TASK');
    }
    const founderFields = ['title', 'description', 'deadline', 'priority', 'assignedTo', 'evidenceRequired', 'status'];
    const memberFields = ['status', 'completionEvidence', 'skipReason'];
    const allowed = context.isFounder ? founderFields : memberFields;
    const requestedFields = Object.keys(body).filter((key) => key !== 'version');
    if (!requestedFields.length || requestedFields.some((key) => !allowed.includes(key))) {
      return responseError(res, 400, 'Task contains unsupported fields', 'INVALID_FIELDS');
    }

    const updates = {};
    if (context.isFounder) {
      const validated = validateTaskFields(body);
      if (validated.error) return responseError(res, 400, validated.error, validated.code);
      Object.assign(updates, validated.values);
      if (body.assignedTo !== undefined) {
        const assignment = await selectAssignee(context.team, body.assignedTo);
        if (assignment.error) return responseError(res, 400, assignment.error, assignment.code);
        updates.assignedTo = assignment.user._id;
      }
    }
    if (body.completionEvidence !== undefined) {
      const evidence = sanitizeText(body.completionEvidence, 2048);
      if (body.completionEvidence && !evidence) {
        return responseError(res, 400, 'Completion evidence must be a valid URL', 'INVALID_EVIDENCE');
      }
      if (!validateHttpUrl(evidence)) {
        return responseError(res, 400, 'Completion evidence must be an HTTP or HTTPS URL', 'INVALID_EVIDENCE');
      }
      updates.completionEvidence = evidence;
    }
    if (body.skipReason !== undefined) {
      if (typeof body.skipReason !== 'string') {
        return responseError(res, 400, 'Skip reason must be text', 'INVALID_SKIP_REASON');
      }
      updates.skipReason = sanitizeText(body.skipReason, 1000);
    }
    if (body.status !== undefined) {
      if (!applyStatusTransition(task.status, body.status, context.isFounder)) {
        return responseError(res, 409, 'This status transition is not allowed', 'INVALID_STATUS_TRANSITION');
      }
      if (body.status === 'SKIPPED' && sanitizeText(body.skipReason ?? task.skipReason, 1000).length < 3) {
        return responseError(res, 400, 'A skip reason of at least 3 characters is required', 'SKIP_REASON_REQUIRED');
      }
      const completionEvidence = updates.completionEvidence ?? task.completionEvidence;
      if (body.status === 'COMPLETED' && task.evidenceRequired
        && (!completionEvidence || !validateHttpUrl(completionEvidence))) {
        return responseError(res, 400, 'Valid completion evidence is required', 'EVIDENCE_REQUIRED');
      }
      updates.status = body.status;
      if (body.status === 'IN_PROGRESS' && !task.startedAt) updates.startedAt = new Date();
      if (body.status === 'COMPLETED') updates.completedAt = new Date();
      else if (task.status === 'COMPLETED') updates.completedAt = null;
      if (body.status === 'SKIPPED') updates.skippedAt = new Date();
      else if (task.status === 'SKIPPED') updates.skippedAt = null;
    }

    const changes = Object.entries(updates)
      .filter(([field, value]) => !['version', 'updatedBy'].includes(field)
        && String(task[field] ?? '') !== String(value ?? ''))
      .map(([field, value]) => ({
        type: field === 'status' ? 'status_changed' : field === 'assignedTo' ? 'reassigned' : 'updated',
        field,
        oldValue: task[field] ?? null,
        newValue: value,
      }));
    if (!changes.length) {
      const savedTask = await populateTask(Task.findById(task._id));
      return res.status(200).json({ success: true, message: 'No task changes to save', task: savedTask });
    }

    const updated = await Task.findOneAndUpdate(
      { _id: task._id, teamId: context.team._id, version: body.version },
      { $set: { ...updates, updatedBy: context.user._id }, $inc: { version: 1 } },
      { new: true, runValidators: true },
    );
    if (!updated) return responseError(res, 409, 'This task has changed. Refresh and try again.', 'STALE_TASK');
    await recordActivities(updated, context.user._id, changes);
    const savedTask = await populateTask(Task.findById(updated._id));
    return res.status(200).json({ success: true, message: 'Task updated', task: savedTask });
  } catch (error) {
    console.error('[ERROR] PATCH /teams/:teamId/tasks/:taskId:', error.message);
    return responseError(res, 500, 'Failed to update task', 'TASK_UPDATE_FAILED');
  }
};

const deleteTask = async (req, res) => {
  try {
    const context = await getContext(req, res);
    if (!context) return;
    if (!context.isFounder) return responseError(res, 403, 'Only the team founder can delete tasks', 'FOUNDER_REQUIRED');
    const { taskId } = req.params;
    if (!isValidId(taskId)) return responseError(res, 400, 'Invalid task ID format', 'INVALID_ID');
    const task = await Task.findOneAndDelete({ _id: taskId, teamId: context.team._id });
    if (!task) return responseError(res, 404, 'Task not found', 'TASK_NOT_FOUND');
    return res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error('[ERROR] DELETE /teams/:teamId/tasks/:taskId:', error.message);
    return responseError(res, 500, 'Failed to delete task', 'TASK_DELETE_FAILED');
  }
};

const normalizeHeader = (value) => sanitizeText(String(value ?? ''), 100).toLowerCase().replace(/[^a-z0-9]/g, '');
const headerNames = {
  employeeemail: 'email',
  email: 'email',
  employeename: 'name',
  name: 'name',
  tasktitle: 'title',
  title: 'title',
  description: 'description',
  deadline: 'deadline',
  priority: 'priority',
  evidencerequired: 'evidenceRequired',
};

const cellText = (cell) => {
  if (cell.type === ExcelJS.ValueType.Formula || (cell.value && typeof cell.value === 'object' && 'formula' in cell.value)) {
    return { formula: true };
  }
  if (cell.value instanceof Date) return { value: cell.value };
  if (cell.value && typeof cell.value === 'object' && 'text' in cell.value) {
    return { value: String(cell.value.text ?? '') };
  }
  return { value: cell.value };
};

const matchEmployee = (users, email, name) => {
  const emailValue = sanitizeText(email, 254).toLowerCase();
  if (emailValue) {
    const matches = users.filter((user) => String(user.email || '').toLowerCase() === emailValue);
    if (matches.length === 1) return { employee: matches[0] };
    if (matches.length > 1) return { error: 'Employee email matches more than one team member' };
    return { error: 'Employee email is not a member of this team' };
  }
  const nameValue = sanitizeText(name, 200).toLowerCase();
  if (!nameValue) return { error: 'Employee Email or Employee Name is required' };
  const matches = users.filter((user) => String(user.name || '').trim().toLowerCase() === nameValue);
  if (matches.length === 1) return { employee: matches[0] };
  if (matches.length > 1) return { error: 'Employee name is ambiguous; use Employee Email' };
  return { error: 'Employee name is not a member of this team' };
};

const parseImportWorkbook = async (file, team) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = String(file.mimetype || '').toLowerCase();
  const xlsxMimes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  const csvMimes = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'];
  if (extension === '.xlsx' && !xlsxMimes.includes(mimeType)) {
    return { error: 'The .xlsx extension does not match the uploaded file type', code: 'INVALID_FILE_TYPE' };
  }
  if (extension === '.csv' && !csvMimes.includes(mimeType)) {
    return { error: 'The .csv extension does not match the uploaded file type', code: 'INVALID_FILE_TYPE' };
  }
  if (!['.xlsx', '.csv'].includes(extension)) {
    return { error: 'Upload an .xlsx or .csv file', code: 'INVALID_FILE_TYPE' };
  }

  const workbook = new ExcelJS.Workbook();
  if (extension === '.xlsx') await workbook.xlsx.load(file.buffer);
  else await workbook.csv.read(Readable.from([file.buffer]));
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 1) {
    return { error: 'The uploaded file has no task rows', code: 'EMPTY_IMPORT' };
  }

  const headerRow = worksheet.getRow(1);
  const columns = new Map();
  headerRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    const normalized = normalizeHeader(cell.value);
    if (headerNames[normalized]) columns.set(columnNumber, headerNames[normalized]);
  });
  if (![...columns.values()].includes('title')) {
    return { error: 'A Task Title column is required', code: 'INVALID_IMPORT_HEADERS' };
  }
  if (![...columns.values()].includes('email') && ![...columns.values()].includes('name')) {
    return { error: 'An Employee Email or Employee Name column is required', code: 'INVALID_IMPORT_HEADERS' };
  }

  const users = await getEligibleUsers(team);
  const rows = [];
  const duplicates = new Set();
  let dataRowCount = 0;
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = {};
    let hasValue = false;
    let formulaFound = false;
    row.eachCell((cell) => {
      if (cellText(cell).formula) formulaFound = true;
    });
    columns.forEach((field, columnNumber) => {
      const result = cellText(row.getCell(columnNumber));
      if (result.formula) formulaFound = true;
      if (result.value !== null && result.value !== undefined && String(result.value).trim()) hasValue = true;
      values[field] = result.value;
    });
    if (!hasValue) return;
    dataRowCount += 1;
    if (formulaFound) {
      rows.push({ rowNumber, status: 'error', reason: 'Formulas are not allowed in import cells' });
      return;
    }

    const title = sanitizeText(values.title, 200);
    const description = sanitizeText(values.description, 4000);
    const employeeMatch = matchEmployee(users, values.email, values.name);
    let reason = employeeMatch.error || '';
    if (!title || title.length < 2) reason ||= 'Task Title must be at least 2 characters';
    if (values.title && String(values.title).length > 200) reason ||= 'Task Title cannot exceed 200 characters';
    const deadline = normalizeDeadline(values.deadline);
    if (values.deadline !== undefined && values.deadline !== null && values.deadline !== '' && !deadline) {
      reason ||= 'Deadline must be a real Excel date, ISO date, or DD-MM-YYYY';
    }
    const priorityText = sanitizeText(String(values.priority ?? 'Medium'), 20);
    const priority = priorityText
      ? PRIORITIES.find((candidate) => candidate.toLowerCase() === priorityText.toLowerCase())
      : 'Medium';
    if (!priority) reason ||= 'Priority must be Low, Medium, or High';
    const evidenceText = sanitizeText(String(values.evidenceRequired ?? ''), 20).toLowerCase();
    let evidenceRequired = false;
    if (['yes', 'true', '1', 'required'].includes(evidenceText)) evidenceRequired = true;
    else if (evidenceText && !['no', 'false', '0', ''].includes(evidenceText)) {
      reason ||= 'Evidence Required must be Yes or No';
    }

    const duplicateKey = employeeMatch.employee
      ? `${asId(employeeMatch.employee._id)}:${title.toLowerCase()}`
      : '';
    if (duplicateKey && duplicates.has(duplicateKey)) reason ||= 'Duplicate task for this employee in the same sheet';
    if (duplicateKey) duplicates.add(duplicateKey);
    const warnings = deadline && deadline < new Date() ? ['Deadline is in the past'] : [];
    rows.push({
      rowNumber,
      status: reason ? 'error' : 'valid',
      ...(reason ? { reason } : {}),
      warnings,
      ...(employeeMatch.employee ? {
        employee: {
          _id: asId(employeeMatch.employee._id),
          name: employeeMatch.employee.name,
          email: employeeMatch.employee.email,
        },
      } : {}),
      task: {
        title,
        description,
        deadline: deadline ? deadline.toISOString() : null,
        priority: priority || 'Medium',
        evidenceRequired,
      },
    });
  });

  if (dataRowCount > MAX_IMPORT_ROWS) {
    return { error: `Imports are limited to ${MAX_IMPORT_ROWS} task rows`, code: 'IMPORT_TOO_LARGE' };
  }
  return { rows, rowCount: dataRowCount, fileName: sanitizeText(path.basename(file.originalname), 255) };
};

const rateLimitImport = (req, res, next) => {
  const key = `${req.user?.uid || req.ip}:${Math.floor(Date.now() / 60000)}`;
  const current = importAttempts.get(key) || 0;
  if (current >= 10) {
    return responseError(res, 429, 'Too many import requests. Try again in a minute.', 'RATE_LIMITED');
  }
  importAttempts.set(key, current + 1);
  if (importAttempts.size > 1000) {
    const activeMinute = Math.floor(Date.now() / 60000);
    importAttempts.forEach((count, entryKey) => {
      if (Number(entryKey.slice(entryKey.lastIndexOf(':') + 1)) < activeMinute) importAttempts.delete(entryKey);
    });
  }
  return next();
};

const previewTaskImport = async (req, res) => {
  try {
    const context = await getContext(req, res);
    if (!context) return;
    if (!context.isFounder) return responseError(res, 403, 'Only the team founder can import tasks', 'FOUNDER_REQUIRED');
    if (!req.file) return responseError(res, 400, 'Choose an .xlsx or .csv file to preview', 'FILE_REQUIRED');
    if (req.file.size > MAX_UPLOAD_BYTES) return responseError(res, 413, 'File size must not exceed 5 MB', 'FILE_TOO_LARGE');

    const result = await parseImportWorkbook(req.file, context.team);
    if (result.error) return responseError(res, 400, result.error, result.code);
    return res.status(200).json({
      success: true,
      message: 'Import preview validated. No tasks have been written.',
      previewId: crypto.randomUUID(),
      fileName: result.fileName,
      rowCount: result.rowCount,
      createdCount: result.rows.filter((row) => row.status === 'valid').length,
      skippedCount: result.rows.filter((row) => row.status === 'error').length,
      rows: result.rows,
    });
  } catch (error) {
    console.error('[ERROR] POST /teams/:teamId/tasks/import/preview:', error.message);
    return responseError(res, 400, 'Unable to parse the uploaded task file', 'INVALID_IMPORT_FILE');
  }
};

const commitTaskImport = async (req, res) => {
  try {
    const context = await getContext(req, res);
    if (!context) return;
    if (!context.isFounder) return responseError(res, 403, 'Only the team founder can import tasks', 'FOUNDER_REQUIRED');
    const previewId = sanitizeText(req.body?.previewId, 100);
    const rows = req.body?.rows;
    if (!previewId || !Array.isArray(rows) || rows.length > MAX_IMPORT_ROWS
      || rows.some((row) => !['valid', 'error'].includes(row?.status))) {
      return responseError(res, 400, 'A preview ID and at most 500 validated rows are required', 'INVALID_IMPORT');
    }
    const existing = await TaskImportBatch.findOne({ previewId, teamId: context.team._id }).lean();
    if (existing) {
      if (existing.status === 'COMMITTING') {
        return responseError(res, 409, 'This import is already being processed', 'IMPORT_IN_PROGRESS');
      }
      return res.status(200).json({
        success: true,
        message: 'This import preview was already committed',
        batch: existing,
        idempotent: true,
      });
    }

    const users = await getEligibleUsers(context.team);
    const userMap = new Map(users.map((user) => [asId(user._id), user]));
    const errors = rows
      .filter((row) => row.status === 'error')
      .map((row, index) => ({
        rowNumber: Number.isInteger(row.rowNumber) ? row.rowNumber : index + 2,
        reason: sanitizeText(row.reason || 'Row was marked invalid in preview', 500),
      }));
    const preparedTasks = [];
    const duplicateKeys = new Set();
    rows.filter((row) => row.status === 'valid').forEach((row, index) => {
      const rowNumber = Number.isInteger(row?.rowNumber) ? row.rowNumber : index + 2;
      const employeeId = asId(row?.employee?._id);
      const employee = userMap.get(employeeId);
      const title = sanitizeText(row?.task?.title, 200);
      const description = sanitizeText(row?.task?.description, 4000);
      const deadline = row?.task?.deadline ? normalizeDeadline(row.task.deadline) : null;
      const priority = row?.task?.priority || 'Medium';
      const evidenceRequired = row?.task?.evidenceRequired === true;
      let reason = '';
      if (!employee) reason = 'Matched employee is no longer a member of this team';
      else if (title.length < 2 || String(row?.task?.title || '').length > 200) reason = 'Task Title must be between 2 and 200 characters';
      else if (row?.task?.deadline && !deadline) reason = 'Deadline must be a valid date';
      else if (!PRIORITIES.includes(priority)) reason = 'Priority must be Low, Medium, or High';
      else if (typeof row?.task?.evidenceRequired !== 'boolean') reason = 'Evidence Required must be a boolean';
      const duplicateKey = employee ? `${employeeId}:${title.toLowerCase()}` : '';
      if (!reason && duplicateKeys.has(duplicateKey)) reason = 'Duplicate task for this employee in the same sheet';
      if (duplicateKey) duplicateKeys.add(duplicateKey);
      if (reason) {
        errors.push({ rowNumber, reason });
        return;
      }
      preparedTasks.push({
        teamId: context.team._id,
        ideaId: context.team.ideaId,
        title,
        description,
        assignedTo: employee._id,
        deadline,
        priority,
        evidenceRequired,
        createdBy: context.user._id,
        updatedBy: context.user._id,
        importRowNumber: rowNumber,
      });
    });

    if (!preparedTasks.length) {
      return responseError(res, 400, 'No valid task rows remain to commit', 'NO_VALID_IMPORT_ROWS');
    }
    let batch;
    try {
      batch = await TaskImportBatch.create({
        teamId: context.team._id,
        uploadedBy: context.user._id,
        previewId,
        fileName: sanitizeText(req.body.fileName || 'task-import.xlsx', 255) || 'task-import.xlsx',
        rowCount: rows.length,
        skippedCount: errors.length,
        errors,
        status: 'COMMITTING',
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      const duplicate = await TaskImportBatch.findOne({ previewId, teamId: context.team._id }).lean();
      if (duplicate) {
        if (duplicate.status === 'COMMITTING') {
          return responseError(res, 409, 'This import is already being processed', 'IMPORT_IN_PROGRESS');
        }
        return res.status(200).json({
          success: true,
          message: 'This import preview was already committed',
          batch: duplicate,
          idempotent: true,
        });
      }
      throw error;
    }

    let createdTasks = [];
    try {
      createdTasks = await Task.insertMany(preparedTasks.map((task) => ({
        ...task,
        importBatchId: batch._id,
      })), { ordered: true });
      await TaskActivity.insertMany(createdTasks.map((task) => ({
        taskId: task._id,
        teamId: task.teamId,
        userId: context.user._id,
        type: 'created',
        field: '',
        oldValue: null,
        newValue: task.title,
      })).concat(createdTasks.map((task) => ({
        taskId: task._id,
        teamId: task.teamId,
        userId: context.user._id,
        type: 'reassigned',
        field: 'assignedTo',
        oldValue: null,
        newValue: task.assignedTo,
      }))));
      batch.createdCount = createdTasks.length;
      batch.status = 'COMMITTED';
      await batch.save();
    } catch (error) {
      if (createdTasks.length) {
        await Task.deleteMany({ _id: { $in: createdTasks.map((task) => task._id) } });
        }
      await TaskImportBatch.deleteOne({ _id: batch._id });
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: 'Task import committed',
      batch: batch.toObject(),
      counts: {
        createdCount: createdTasks.length,
        skippedCount: errors.length,
      },
    });
  } catch (error) {
    console.error('[ERROR] POST /teams/:teamId/tasks/import/commit:', error.message);
    return responseError(res, 500, 'Failed to commit task import', 'TASK_IMPORT_FAILED');
  }
};

const undoTaskImport = async (req, res) => {
  try {
    const context = await getContext(req, res);
    if (!context) return;
    if (!context.isFounder) return responseError(res, 403, 'Only the team founder can undo imports', 'FOUNDER_REQUIRED');
    if (!isValidId(req.params.batchId)) return responseError(res, 400, 'Invalid import batch ID', 'INVALID_ID');
    const batch = await TaskImportBatch.findOne({
      _id: req.params.batchId,
      teamId: context.team._id,
    });
    if (!batch) return responseError(res, 404, 'Import batch not found', 'IMPORT_BATCH_NOT_FOUND');
    if (batch.status !== 'COMMITTED') {
      return responseError(res, 409, 'Only committed imports can be undone', 'IMPORT_NOT_UNDOABLE');
    }
    const pendingTasks = await Task.find({
      importBatchId: batch._id,
      status: 'TODO',
    }).select('_id').lean();
    const deletedIds = pendingTasks.map((task) => task._id);
    if (deletedIds.length) {
      await Task.deleteMany({ _id: { $in: deletedIds }, status: 'TODO' });
    }
    batch.status = deletedIds.length === batch.createdCount ? 'UNDONE' : 'PARTIAL_UNDO';
    await batch.save();
    return res.status(200).json({
      success: true,
      message: 'Import undo completed for tasks that were still TODO',
      batch,
      deletedCount: deletedIds.length,
      retainedCount: batch.createdCount - deletedIds.length,
    });
  } catch (error) {
    console.error('[ERROR] POST /teams/:teamId/tasks/import/:batchId/undo:', error.message);
    return responseError(res, 500, 'Failed to undo task import', 'TASK_IMPORT_UNDO_FAILED');
  }
};

module.exports = {
  commitTaskImport,
  createTask,
  deleteTask,
  getTaskSummary,
  getTaskTemplate,
  listTasks,
  previewTaskImport,
  rateLimitImport,
  undoTaskImport,
  updateTask,
  applyStatusTransition,
  normalizeDeadline,
  parseImportWorkbook,
};
