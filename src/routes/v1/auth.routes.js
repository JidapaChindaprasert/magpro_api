const express = require('express');
const { body } = require('express-validator');
const authController = require('../../controllers/auth.controller');
const validateRequest = require('../../middleware/validate');
const { loginLimiter } = require('../../middleware/rate-limit');

const router = express.Router();

router.post(
    '/login',
    loginLimiter,
    [
        body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
        body('password').notEmpty().withMessage('Password is required')
    ],
    validateRequest,
    authController.login
);

router.post('/logout', authController.logout);

router.post(
    '/register',
    [
        body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
        body('firstname').notEmpty().withMessage('First name is required'),
        body('lastname').notEmpty().withMessage('Last name is required'),
        body('studentId').notEmpty().withMessage('Student ID is required')
    ],
    validateRequest,
    authController.register
);

module.exports = router;
