const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
    logger.error({ err, path: req.path }, 'Unhandled Exception');
    
    // Do NOT expose SQL errors or stack traces to the client
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: message
    });
};

module.exports = errorHandler;
