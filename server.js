require('dotenv').config();
const app = require('./src/app');
const { initUsersTable } = require('./src/services/user.service');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await initUsersTable();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});