const express = require('express');
const { query } = require('express-validator');
const dashboardController = require('../../controllers/dashboard.controller');
const validateRequest = require('../../middleware/validate');
const { requireUser } = require('../../middleware/auth');

const router = express.Router();

// All dashboard routes are protected by JWT cookie auth
router.use(requireUser);

router.get(
    '/me/quizzes',
    [
        query('lang').optional().isString().isLength({ min: 2, max: 2 })
    ],
    validateRequest,
    dashboardController.getMyQuizzes
);

router.get(
    '/me/reading',
    [
        query('lang').optional().isString().isLength({ min: 2, max: 2 })
    ],
    validateRequest,
    dashboardController.getMyReadingProgress
);

module.exports = router;
