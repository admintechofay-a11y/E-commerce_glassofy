const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }
  if (mongoose.connection.readyState === 1) {
    cachedConnection = mongoose.connection;
    return cachedConnection;
  }
  if (mongoose.connection.readyState === 2) {
    // Already connecting, wait briefly
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (mongoose.connection.readyState === 1) {
          clearInterval(check);
          cachedConnection = mongoose.connection;
          resolve(cachedConnection);
        } else if (mongoose.connection.readyState === 0) {
          clearInterval(check);
          resolve(null);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve(null);
      }, 4000);
    });
  }

  try {
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    cachedConnection = conn;
    return conn;
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    throw error;
  }
};

// Eagerly initiate background connection in production/serverless
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  connectDB().catch((err) => console.warn('[Eager DB Boot Warning]', err.message));
}

module.exports = connectDB;
