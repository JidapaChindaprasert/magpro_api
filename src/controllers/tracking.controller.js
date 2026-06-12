const pool = require('../config/db');

const saveArticleProgress = async (req, res, next) => {
    try {
        const { article_id, progress_percentage } = req.body;
        const user_id = req.user.id;

        // Upsert reading progress (MySQL syntax)
        await pool.execute(
            `INSERT INTO ArticleProgress (user_id, article_id, progress_percentage) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE progress_percentage = GREATEST(progress_percentage, VALUES(progress_percentage)), last_read_at = CURRENT_TIMESTAMP`,
            [user_id, article_id, progress_percentage]
        );

        res.status(200).json({ success: true, message: 'Progress saved' });
    } catch (err) {
        next(err);
    }
};

const startQuizSession = async (req, res, next) => {
    try {
        const { quiz_id } = req.body;
        const user_id = req.user.id;

        const [result] = await pool.execute(
            'INSERT INTO AnswerSession (quiz_id, user_id) VALUES (?, ?)',
            [quiz_id, user_id]
        );

        res.status(201).json({ success: true, data: { session_id: result.insertId } });
    } catch (err) {
        next(err);
    }
};

const submitAnswer = async (req, res, next) => {
    try {
        const { session_id, question_id, choice_id, text_answer } = req.body;

        await pool.execute(
            'INSERT INTO Answer (session_id, question_id, choice_id, text_answer) VALUES (?, ?, ?, ?)',
            [session_id, question_id, choice_id || null, text_answer || null]
        );

        res.status(201).json({ success: true, message: 'Answer recorded' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    saveArticleProgress,
    startQuizSession,
    submitAnswer
};
