const express = require('express');
const cors = require('cors');
const authenticateUser = require('./middleware/authMiddleware');
const userRoutes = require('./routes/userRoutes');
const ideaRoutes = require('./routes/ideaRoutes');
const aiRoutes = require('./routes/aiRoutes');
const matchingRoutes = require('./routes/matchingRoutes');

const app = express();

app.use(express.json());
app.use(cors());
app.use('/api/users', userRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/ideas', aiRoutes);
app.use('/api/candidates', matchingRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

app.get('/api/auth/me', authenticateUser, (req, res) => {
  res.status(200).json({ uid: req.user.uid, email: req.user.email });
});

module.exports = app;
