const express = require('express');
const connectToDatabase = require('./config/db');

const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Backend is running',
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
