const express = require('express');
const router = express.Router();
const lessonController = require('../../controllers/lesson.controller');
const { requireUser, optionalUser } = require('../../middleware/auth');

router.get('/', optionalUser, lessonController.getLessons);
router.get('/:id', optionalUser, lessonController.getLessonById);
router.post('/:id/complete', optionalUser, lessonController.markLessonComplete);

module.exports = router;
