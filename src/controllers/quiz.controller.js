const pool = require('../config/db');

exports.getQuizByArticleId = async (req, res, next) => {
    try {
        const { articleId } = req.params;
        const lang = req.query.lang || 'en';

        // Get Quiz info
        const [quizzes] = await pool.query(`
            SELECT q.quiz_id, qt.title, qt.description
            FROM Quiz q
            LEFT JOIN QuizTranslation qt ON q.quiz_id = qt.quiz_id AND qt.language_code = ?
            WHERE q.article_id = ?
        `, [lang, articleId]);

        if (quizzes.length === 0) {
            return res.status(404).json({ success: false, message: 'Quiz not found for this article' });
        }
        const quiz = quizzes[0];

        // Get Questions
        const [questions] = await pool.query(`
            SELECT q.question_id, q.type, q.order_index, qt.question_text
            FROM Question q
            LEFT JOIN QuestionTranslation qt ON q.question_id = qt.question_id AND qt.language_code = ?
            WHERE q.quiz_id = ?
            ORDER BY q.order_index ASC
        `, [lang, quiz.quiz_id]);

        // Get Choices for these questions (WITHOUT is_correct)
        if (questions.length > 0) {
            const questionIds = questions.map(q => q.question_id);
            const [choices] = await pool.query(`
                SELECT c.choice_id, c.quest_id, c.order_index, ct.choice_text
                FROM Choice c
                LEFT JOIN ChoiceTranslation ct ON c.choice_id = ct.choice_id AND ct.language_code = ?
                WHERE c.quest_id IN (?)
                ORDER BY c.quest_id, c.order_index ASC
            `, [lang, questionIds]);

            // Map choices to questions
            questions.forEach(q => {
                q.choices = choices.filter(c => c.quest_id === q.question_id);
            });
        }

        quiz.questions = questions;

        res.status(200).json({ success: true, data: quiz });
    } catch (error) {
        next(error);
    }
};

exports.submitQuiz = async (req, res, next) => {
    try {
        const { articleId } = req.params;
        const { answers } = req.body; // array of { question_id, choice_id }
        const userId = req.user ? req.user.id : null;

        // 1. Find Quiz
        const [quizzes] = await pool.query(`SELECT quiz_id FROM Quiz WHERE article_id = ?`, [articleId]);
        if (quizzes.length === 0) return res.status(404).json({ success: false, message: 'Quiz not found' });
        const quizId = quizzes[0].quiz_id;

        // 2. Evaluate answers
        let score = 0;
        const feedback = [];
        
        for (const ans of answers) {
            if (!ans.choice_id) continue;
            
            const [choices] = await pool.query(
                `SELECT is_correct FROM Choice WHERE choice_id = ? AND quest_id = ?`, 
                [ans.choice_id, ans.question_id]
            );
            
            const isCorrect = choices.length > 0 && choices[0].is_correct === 1;
            if (isCorrect) score += 1; // dummy scoring
            
            feedback.push({
                question_id: ans.question_id,
                choice_id: ans.choice_id,
                is_correct: isCorrect
            });
        }

        // 3. Update ArticleProgress to 100 (only for student role to prevent FK violation)
        if (req.user && req.user.role === 'student') {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                const [progress] = await connection.query(
                    `SELECT progress_id FROM ArticleProgress WHERE user_id = ? AND article_id = ?`,
                    [userId, articleId]
                );

                if (progress.length > 0) {
                    await connection.query(
                        `UPDATE ArticleProgress SET progress = 100, end_at = NOW() WHERE progress_id = ?`,
                        [progress[0].progress_id]
                    );
                } else {
                    await connection.query(
                        `INSERT INTO ArticleProgress (user_id, article_id, progress, end_at) VALUES (?, ?, 100, NOW())`,
                        [userId, articleId]
                    );
                }

                // 4. Save Quiz Score of the newest attempt in AnswerSession
                const [sessionResult] = await connection.query(
                    `INSERT INTO AnswerSession (quiz_id, user_id, score_total, submit_at) VALUES (?, ?, ?, NOW())`,
                    [quizId, userId, score]
                );
                const sessionId = sessionResult.insertId;

                // 5. Save individual answers
                for (const ans of feedback) {
                    await connection.query(
                        `INSERT INTO Answer (session_id, question_id, choice_id, is_correct, score) VALUES (?, ?, ?, ?, ?)`,
                        [sessionId, ans.question_id, ans.choice_id, ans.is_correct ? 1 : 0, ans.is_correct ? 1 : 0]
                    );
                }

                await connection.commit();
            } catch (err) {
                await connection.rollback();
                throw err;
            } finally {
                connection.release();
            }
        }

        res.status(200).json({ 
            success: true, 
            data: { 
                score, 
                feedback,
                message: 'Quiz completed successfully'
            } 
        });
    } catch (error) {
        next(error);
    }
};
