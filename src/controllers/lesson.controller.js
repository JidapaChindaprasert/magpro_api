const pool = require('../config/db');

const getLessons = async (req, res, next) => {
    try {
        const lang = req.query.lang || 'en';
        const userId = req.user ? req.user.id : null;

        const query = `
            SELECT 
                a.article_id, 
                a.create_at,
                t.title, 
                t.description,
                IFNULL(p.progress, 0) as progress
            FROM Article a
            JOIN ArticleTranslation t ON a.article_id = t.article_id AND t.language_code = ?
            LEFT JOIN (
                SELECT article_id, MAX(progress) as progress 
                FROM ArticleProgress 
                WHERE user_id = ? 
                GROUP BY article_id
            ) p ON a.article_id = p.article_id
            ORDER BY a.create_at ASC
        `;
        const [rows] = await pool.execute(query, [lang, userId]);

        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const getLessonById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const lang = req.query.lang || 'en';
        const userId = req.user ? req.user.id : null;

        const articleQuery = `
            SELECT 
                a.article_id, 
                t.title, 
                t.description,
                IFNULL(p.progress, 0) as progress
            FROM Article a
            JOIN ArticleTranslation t ON a.article_id = t.article_id AND t.language_code = ?
            LEFT JOIN (
                SELECT article_id, MAX(progress) as progress 
                FROM ArticleProgress 
                WHERE user_id = ? AND article_id = ?
                GROUP BY article_id
            ) p ON a.article_id = p.article_id
            WHERE a.article_id = ?
        `;
        const [articles] = await pool.execute(articleQuery, [lang, userId, id, id]);

        if (articles.length === 0) {
            return res.status(404).json({ success: false, error: 'Lesson not found' });
        }

        const article = articles[0];

        const contentQuery = `
            SELECT 
                c.content_id, 
                c.type, 
                c.order_index,
                ct.content_text, 
                ct.content_url
            FROM ContentBox c
            JOIN ContentBoxTranslation ct ON c.content_id = ct.content_id AND ct.language_code = ?
            WHERE c.article_id = ?
            ORDER BY c.order_index ASC
        `;
        const [contentBoxes] = await pool.execute(contentQuery, [lang, id]);

        article.content = contentBoxes;

        res.status(200).json({ success: true, data: article });
    } catch (err) {
        next(err);
    }
};

const markLessonComplete = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user ? req.user.id : null;

        // Only update progress for student role to prevent FK violation
        if (req.user && req.user.role === 'student') {
            // Check if progress already exists
            const [existing] = await pool.execute(
                'SELECT progress_id FROM ArticleProgress WHERE user_id = ? AND article_id = ?',
                [userId, id]
            );

            if (existing.length > 0) {
                await pool.execute(
                    'UPDATE ArticleProgress SET progress = 100, end_at = NOW() WHERE progress_id = ?',
                    [existing[0].progress_id]
                );
            } else {
                await pool.execute(
                    'INSERT INTO ArticleProgress (user_id, article_id, progress, start_at, end_at) VALUES (?, ?, 100, NOW(), NOW())',
                    [userId, id]
                );
            }
        }

        res.status(200).json({ success: true, message: 'Lesson marked as complete' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getLessons,
    getLessonById,
    markLessonComplete
};
