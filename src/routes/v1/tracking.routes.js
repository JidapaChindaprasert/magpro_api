const express = require('express');
const { body } = require('express-validator');
const trackingController = require('../../controllers/tracking.controller');
const validateRequest = require('../../middleware/validate');
const { requireUser } = require('../../middleware/auth');

const router = express.Router();

// Only logged in students can track their progress
router.use(requireUser);

router.post(
    '/article',
    [
        body('article_id').isInt(),
        body('progress_percentage').isFloat({ min: 0, max: 100 })
    ],
    validateRequest,
    trackingController.saveArticleProgress
);

router.post(
    '/quiz/start',
    [body('quiz_id').isInt()],
    validateRequest,
    trackingController.startQuizSession
);

router.post(
    '/quiz/answer',
    [
        body('session_id').isInt(),
        body('question_id').isInt(),
        body('choice_id').optional({ nullable: true }).isInt(),
        body('text_answer').optional({ nullable: true }).isString()
    ],
    validateRequest,
    trackingController.submitAnswer
);

module.exports = router;
