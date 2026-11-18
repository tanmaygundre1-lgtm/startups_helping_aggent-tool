const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const Task = require('../../models/Task');
const TaskActivity = require('../../models/TaskActivity');
const TaskImportBatch = require('../../models/TaskImportBatch');
const User = require('../../models/User');
const Team = require('../../models/Team');
const taskRoutes = require('../../routes/taskRoutes');
const {
  applyStatusTransition,
  normalizeDeadline,
  parseImportWorkbook,
  rateLimitImport,
  updateTask,
} = require('../../controllers/taskController');

const founderId = '507f1f77bcf86cd799439011';
const memberId = '507f1f77bcf86cd799439012';
const teamId = '507f1f77bcf86cd799439013';
const taskId = '507f1f77bcf86cd799439014';

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test('task schemas include team ownership, execution fields, activity, and import audit indexes', () => {
  assert.equal(Task.schema.path('teamId').isRequired, true);
  assert.equal(Task.schema.path('assignedTo').isRequired, true);
  assert.deepEqual(Task.schema.path('status').enumValues, [
    'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'SKIPPED', 'BLOCKED',
  ]);
  assert.equal(Task.schema.path('version').defaultValue, 0);
  assert.ok(Task.schema.indexes().some(([fields]) => (
    fields.teamId === 1 && fields.assignedTo === 1 && fields.status === 1
  )));
  assert.ok(TaskActivity.schema.path('taskId').isRequired);
  assert.ok(TaskImportBatch.schema.indexes().some(([fields, options]) => (
    fields.teamId === 1 && fields.previewId === 1 && options.unique
  )));
});

test('member task transitions enforce the configured non-review path', () => {
  assert.equal(applyStatusTransition('TODO', 'IN_PROGRESS', false), true);
  assert.equal(applyStatusTransition('TODO', 'SKIPPED', false), true);
  assert.equal(applyStatusTransition('IN_PROGRESS', 'COMPLETED', false), true);
  assert.equal(applyStatusTransition('IN_PROGRESS', 'BLOCKED', false), true);
  assert.equal(applyStatusTransition('BLOCKED', 'IN_PROGRESS', false), true);
  assert.equal(applyStatusTransition('SKIPPED', 'TODO', false), true);
  assert.equal(applyStatusTransition('TODO', 'COMPLETED', false), false);
  assert.equal(applyStatusTransition('COMPLETED', 'TODO', false), false);
  assert.equal(applyStatusTransition('IN_REVIEW', 'COMPLETED', true), false);
});

test('deadlines parse ISO and DD-MM-YYYY while rejecting invalid calendar dates', () => {
  assert.equal(normalizeDeadline('2030-12-31').toISOString().slice(0, 10), '2030-12-31');
  assert.equal(normalizeDeadline('31-12-2030').toISOString().slice(0, 10), '2030-12-31');
  assert.equal(normalizeDeadline('31-02-2030'), null);
});

test('Excel import preview matches employees, marks duplicates, and warns on past deadlines', async () => {
  const originalFind = User.find;
  const employees = [
    { _id: '507f1f77bcf86cd799439011', name: 'Ava Founder', email: 'ava@example.com' },
    { _id: '507f1f77bcf86cd799439012', name: 'Milo Member', email: 'milo@example.com' },
  ];
  try {
    User.find = () => ({
      select() {
        return this;
      },
      lean: async () => employees,
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tasks');
    sheet.addRow([
      'Employee Email',
      'Employee Name',
      'Task Title',
      'Description',
      'Deadline',
      'Priority',
      'Evidence Required',
    ]);
    sheet.addRow(['milo@example.com', '', 'Build API', 'Create endpoint', '01-01-2020', 'High', 'Yes']);
    sheet.addRow(['', 'Milo Member', 'Build API', 'Duplicate task', '', 'Medium', 'No']);
    sheet.addRow(['unknown@example.com', '', 'Write tests', '', '', 'Low', 'No']);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const result = await parseImportWorkbook({
      originalname: 'tasks.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    }, { _id: '507f1f77bcf86cd799439099', founderId: employees[0]._id, members: [{ userId: employees[1]._id }] });

    assert.equal(result.rowCount, 3);
    assert.equal(result.rows[0].status, 'valid');
    assert.equal(result.rows[0].employee.email, 'milo@example.com');
    assert.deepEqual(result.rows[0].warnings, ['Deadline is in the past']);
    assert.equal(result.rows[1].status, 'error');
    assert.match(result.rows[1].reason, /Duplicate task/);
    assert.equal(result.rows[2].status, 'error');
    assert.match(result.rows[2].reason, /not a member/);
  } finally {
    User.find = originalFind;
  }
});

test('task import rejects extension and MIME type mismatches', async () => {
  const result = await parseImportWorkbook({
    originalname: 'tasks.xlsx',
    mimetype: 'text/csv',
    buffer: Buffer.from('not an xlsx'),
  }, { _id: '507f1f77bcf86cd799439099', founderId: '507f1f77bcf86cd799439011', members: [] });
  assert.equal(result.code, 'INVALID_FILE_TYPE');
});

test('task import endpoints are authenticated and rate limited', () => {
  const firstLayer = taskRoutes.stack[0];
  assert.equal(firstLayer.name, 'authenticateUser');
  const req = { user: { uid: 'task-test-user' }, ip: '127.0.0.1' };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  let nextCalled = 0;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    rateLimitImport(req, res, () => { nextCalled += 1; });
  }
  rateLimitImport(req, res, () => { nextCalled += 1; });
  assert.equal(nextCalled, 10);
  assert.equal(res.statusCode, 429);
  assert.equal(res.payload.code, 'RATE_LIMITED');
});

test('task update rejects stale versions before writing', async () => {
  const originals = {
    userFindOne: User.findOne,
    teamFindById: Team.findById,
    taskFindOne: Task.findOne,
    taskFindOneAndUpdate: Task.findOneAndUpdate,
  };
  let writeCalled = false;
  try {
    User.findOne = () => ({ lean: async () => ({ _id: memberId }) });
    Team.findById = () => ({
      lean: async () => ({ _id: teamId, founderId, members: [{ userId: memberId }] }),
    });
    Task.findOne = async () => ({
      _id: taskId,
      teamId,
      assignedTo: memberId,
      status: 'TODO',
      version: 4,
    });
    Task.findOneAndUpdate = async () => {
      writeCalled = true;
    };

    const res = createResponse();
    await updateTask({
      params: { teamId, taskId },
      user: { uid: 'member-firebase' },
      body: { version: 3, status: 'IN_PROGRESS' },
    }, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, 'STALE_TASK');
    assert.equal(writeCalled, false);
  } finally {
    User.findOne = originals.userFindOne;
    Team.findById = originals.teamFindById;
    Task.findOne = originals.taskFindOne;
    Task.findOneAndUpdate = originals.taskFindOneAndUpdate;
  }
});

test('task update prevents members from editing founder-only fields', async () => {
  const originals = {
    userFindOne: User.findOne,
    teamFindById: Team.findById,
    taskFindOne: Task.findOne,
    taskFindOneAndUpdate: Task.findOneAndUpdate,
  };
  let writeCalled = false;
  try {
    User.findOne = () => ({ lean: async () => ({ _id: memberId }) });
    Team.findById = () => ({
      lean: async () => ({ _id: teamId, founderId, members: [{ userId: memberId }] }),
    });
    Task.findOne = async () => ({
      _id: taskId,
      teamId,
      assignedTo: memberId,
      status: 'TODO',
      version: 0,
    });
    Task.findOneAndUpdate = async () => {
      writeCalled = true;
    };

    const res = createResponse();
    await updateTask({
      params: { teamId, taskId },
      user: { uid: 'member-firebase' },
      body: { version: 0, title: 'Try to reassign this task' },
    }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'INVALID_FIELDS');
    assert.equal(writeCalled, false);
  } finally {
    User.findOne = originals.userFindOne;
    Team.findById = originals.teamFindById;
    Task.findOne = originals.taskFindOne;
    Task.findOneAndUpdate = originals.taskFindOneAndUpdate;
  }
});

test('task completion requires valid evidence when configured on the task', async () => {
  const originals = {
    userFindOne: User.findOne,
    teamFindById: Team.findById,
    taskFindOne: Task.findOne,
    taskFindOneAndUpdate: Task.findOneAndUpdate,
  };
  let writeCalled = false;
  try {
    User.findOne = () => ({ lean: async () => ({ _id: memberId }) });
    Team.findById = () => ({
      lean: async () => ({ _id: teamId, founderId, members: [{ userId: memberId }] }),
    });
    Task.findOne = async () => ({
      _id: taskId,
      teamId,
      assignedTo: memberId,
      status: 'IN_PROGRESS',
      evidenceRequired: true,
      completionEvidence: '',
      version: 0,
    });
    Task.findOneAndUpdate = async () => {
      writeCalled = true;
    };

    const res = createResponse();
    await updateTask({
      params: { teamId, taskId },
      user: { uid: 'member-firebase' },
      body: { version: 0, status: 'COMPLETED' },
    }, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'EVIDENCE_REQUIRED');
    assert.equal(writeCalled, false);
  } finally {
    User.findOne = originals.userFindOne;
    Team.findById = originals.teamFindById;
    Task.findOne = originals.taskFindOne;
    Task.findOneAndUpdate = originals.taskFindOneAndUpdate;
  }
});
