const express = require('express');
const multer = require('multer');
const authenticateUser = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/taskController');

const router = express.Router({ mergeParams: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

router.use(authenticateUser);

router.get('/summary', getTaskSummary);
router.get('/template', getTaskTemplate);
router.post('/import/preview', rateLimitImport, (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File size must not exceed 5 MB',
        code: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Unable to receive the uploaded file',
      code: 'INVALID_UPLOAD',
    });
  });
}, previewTaskImport);
router.post('/import/commit', rateLimitImport, commitTaskImport);
router.post('/import/:batchId/undo', rateLimitImport, undoTaskImport);
router.get('/', listTasks);
router.post('/', createTask);
router.patch('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);

module.exports = router;
