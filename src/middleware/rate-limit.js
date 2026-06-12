const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// Disabled 15-minute login lock as requested
const loginLimiter = (req, res, next) => {
    next();
};

/*
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    handler: (req, res) => {
        logger.warn({ ip: req.ip }, 'Rate limit exceeded for login');
        res.status(429).json({
            success: false,
            error: 'Too many login attempts, please try again after 15 minutes'
        });
    }
});
*/

module.exports = {
    loginLimiter
};
