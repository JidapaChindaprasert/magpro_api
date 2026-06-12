const adminService = require('../services/admin.service');

const getLessons = async (req, res, next) => {
    try {
        const lang = req.query.lang || 'en';
        const lessons = await adminService.getAllLessons(lang);
        res.status(200).json({ success: true, data: lessons });
    } catch (err) {
        next(err);
    }
};

const getLessonById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const lesson = await adminService.getLessonForEdit(id);
        if (!lesson) {
            return res.status(404).json({ success: false, error: 'Lesson not found' });
        }
        res.status(200).json({ success: true, data: lesson });
    } catch (err) {
        next(err);
    }
};

const createLesson = async (req, res, next) => {
    try {
        const data = req.body;
        const id = await adminService.createCompleteLesson(data);
        res.status(201).json({ success: true, data: { id } });
    } catch (err) {
        next(err);
    }
};

const updateLesson = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = req.body;
        await adminService.saveLesson(id, data);
        res.status(200).json({ success: true, message: 'Lesson updated successfully' });
    } catch (err) {
        next(err);
    }
};

const deleteLesson = async (req, res, next) => {
    try {
        const { id } = req.params;
        await adminService.deleteLesson(id);
        res.status(200).json({ success: true, message: 'Lesson deleted successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getLessons,
    getLessonById,
    createLesson,
    updateLesson,
    deleteLesson
};
