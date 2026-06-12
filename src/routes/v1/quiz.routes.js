const express = require('express');
const router = express.Router();
const { optionalUser } = require('../../middleware/auth');
const quizController = require('../../controllers/quiz.controller');

// Get quiz for an article (Optional auth to support guests)
router.get('/lesson/:articleId', optionalUser, quizController.getQuizByArticleId);

// Submit quiz answers (Optional auth to support guests)
router.post('/lesson/:articleId/submit', optionalUser, quizController.submitQuiz);

module.exports = router;
