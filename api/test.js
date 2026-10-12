module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Serverless function test endpoint is working!',
    timestamp: new Date().toISOString(),
    env: {
      hasMongoUri: Boolean(process.env.MONGO_URI),
      nodeEnv: process.env.NODE_ENV,
    },
  });
};
