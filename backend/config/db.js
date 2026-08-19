const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DATABASE_NAME,
    });

    console.log(`MongoDB connected to database: ${process.env.MONGODB_DATABASE_NAME}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.name);
    throw error;
  }
};

module.exports = connectToDatabase;
