const mongoose = require('mongoose');

/**
 * Executes a callback within a MongoDB transaction if replica set transactions are supported.
 * Automatically handles commit, abort, and session cleanup.
 *
 * @param {Function} callback - Async function(session) to execute
 * @returns {Promise<any>}
 */
const runInTransaction = async (callback) => {
  const session = await mongoose.startSession();

  try {
    const isReplicaSet = Boolean(
      mongoose.connection.client?.topology?.description?.setName ||
      mongoose.connection.client?.topology?.description?.type === 'ReplicaSetWithPrimary'
    );

    let result;
    if (isReplicaSet) {
      await session.withTransaction(async () => {
        result = await callback(session);
      });
    } else {
      // Standalone mongod (e.g. single MongoMemoryServer in local test)
      result = await callback(session);
    }
    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  runInTransaction,
};
