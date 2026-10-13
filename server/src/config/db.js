const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

let cachedConnection = null;

// Prevent infinite buffering in serverless runtimes
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState >= 1) {
    return cachedConnection;
  }
  if (mongoose.connection.readyState >= 1) {
    cachedConnection = mongoose.connection;
    return cachedConnection;
  }
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
      maxPoolSize: 10,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    cachedConnection = conn;
    return conn;
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    // Do not terminate process to ensure serverless health endpoints and fallbacks stay operational
    throw error;
  }
};

module.exports = connectDB;
