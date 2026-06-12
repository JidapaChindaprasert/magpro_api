const { validationResult } = require('express-validator');

// Middleware to check for express-validator errors and return them
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

module.exports = validateRequest;
