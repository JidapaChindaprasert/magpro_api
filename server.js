require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/config/logger');

// Validate critical environment variables
if (!process.env.JWT_SECRET) {
    logger.fatal('CRITICAL: JWT_SECRET environment variable is missing. Refusing to boot.');
    process.exit(1);
}
if (!process.env.DB_PASSWORD) {
    logger.fatal('CRITICAL: DB_PASSWORD environment variable is missing. Refusing to boot.');
    process.exit(1);
}

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

// Server binds to 127.0.0.1 (localhost) by default for security during development
app.listen(PORT, HOST, () => {
    logger.info(`Server is securely running on http://${HOST}:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
});
