const express = require('express');
const { query } = require('express-validator');
const adminController = require('../../controllers/admin.controller');
const validateRequest = require('../../middleware/validate');
const { requireInstructor } = require('../../middleware/auth');

const router = express.Router();

// ALL admin routes require an instructor or admin!
router.use(requireInstructor);

router.get(
    '/lessons',
    [query('lang').optional().isString().isLength({ min: 2, max: 2 })],
    validateRequest,
    adminController.getLessons
);

router.get('/lessons/:id', adminController.getLessonById);
router.post('/lessons', adminController.createLesson);
router.put('/lessons/:id', adminController.updateLesson);
router.delete('/lessons/:id', adminController.deleteLesson);

// Device administration routes
router.get('/devices', adminController.getDevices);
router.post('/devices', adminController.createDevice);
router.delete('/devices/:id', adminController.deleteDevice);

module.exports = router;
