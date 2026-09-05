const connectToDatabase = require('./config/db');
const app = require('./app');

const dotenv = require('dotenv');
dotenv.config();

const port = process.env.PORT || 5000;

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
