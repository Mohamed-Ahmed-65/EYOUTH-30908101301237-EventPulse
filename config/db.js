const mongoose = require('mongoose');

async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) {
    const err = new Error('MONGO_URI is not set');
    console.error(err.message);
    if (process.env.NODE_ENV !== 'test') process.exit(1);
    throw err;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(uri);
    return mongoose.connection;
  } catch (err) {
    console.error(`Database connection failed: ${err.message}`);
    if (process.env.NODE_ENV !== 'test') process.exit(1);
    throw err;
  }
}

function dbHealth() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const readyState = mongoose.connection.readyState;
  return {
    readyState,
    status: states[readyState] || 'unknown',
    connected: readyState === 1,
  };
}

module.exports = { connectDB, dbHealth };
