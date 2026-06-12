const pool = require('../config/db');
const logger = require('../config/logger');

const getMyQuizzes = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const lang = req.query.lang || 'en'; // Default to english

        const [rows] = await pool.execute(
            'SELECT * FROM v_student_quiz_report WHERE student_id = ? AND language_code = ?',
            [userId, lang]
        );

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (err) {
        next(err);
    }
};

const getMyReadingProgress = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const lang = req.query.lang || 'en';

        const [rows] = await pool.execute(
            'SELECT * FROM v_student_reading_progress WHERE student_id = ? AND language_code = ?',
            [userId, lang]
        );

        res.status(200).json({
            success: true,
            data: rows
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getMyQuizzes,
    getMyReadingProgress
};
