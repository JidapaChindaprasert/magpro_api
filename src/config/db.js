const mysql = require('mysql2/promise');
const logger = require('./logger');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then(connection => {
        logger.info('Successfully connected to MySQL database');
        connection.release();
    })
    .catch(err => {
        logger.fatal({ err }, 'Failed to connect to MySQL database');
        process.exit(1);
    });

module.exports = pool;
