const express = require('express');
const cors = require('cors');
const connectToDatabase = require('./config/db');
const authenticateUser = require('./middleware/authMiddleware');
const userRoutes = require('./routes/userRoutes');
const ideaRoutes = require('./routes/ideaRoutes');
const aiRoutes = require('./routes/aiRoutes');

const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use('/api/users', userRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/ideas', aiRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Backend is running',
  });
});

app.get('/api/auth/me', authenticateUser, (req, res) => {
  res.status(200).json({
    uid: req.user.uid,
    email: req.user.email,
  });
});

const startServer = async () => {
  try {
    await connectToDatabase();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Server startup failed. Check your environment variables and MongoDB access.');
    process.exitCode = 1;
  }
};

startServer();
