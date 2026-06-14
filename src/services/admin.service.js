const pool = require('../config/db');

class AdminService {
    async getAllLessons(lang) {
        const [articles] = await pool.execute(
            `SELECT a.article_id, art.title, art.description, 
                    (SELECT COUNT(*) FROM Quiz q WHERE q.article_id = a.article_id) > 0 as has_quiz
             FROM Article a
             LEFT JOIN ArticleTranslation art ON a.article_id = art.article_id AND art.language_code = ?
             ORDER BY a.create_at ASC`,
            [lang]
        );
        return articles;
    }

    async getLessonForEdit(articleId) {
        // 1. Get Article translations
        const [articleRows] = await pool.execute(
            `SELECT a.article_id, at.language_code, at.title, at.description
             FROM Article a
             LEFT JOIN ArticleTranslation at ON a.article_id = at.article_id
             WHERE a.article_id = ?`,
            [articleId]
        );
        if (articleRows.length === 0) return null;

        const lesson = {
            article_id: articleId,
            title_en: '',
            description_en: '',
            title_th: '',
            description_th: '',
            content: [],
            quiz: null
        };

        articleRows.forEach(row => {
            if (row.language_code === 'en') {
                lesson.title_en = row.title || '';
                lesson.description_en = row.description || '';
            } else if (row.language_code === 'th') {
                lesson.title_th = row.title || '';
                lesson.description_th = row.description || '';
            }
        });

        // 2. Get Content Boxes
        const [contentRows] = await pool.execute(
            `SELECT c.content_id, c.type, c.order_index, ct.language_code, ct.content_text, ct.content_url
             FROM ContentBox c
             LEFT JOIN ContentBoxTranslation ct ON c.content_id = ct.content_id
             WHERE c.article_id = ?
             ORDER BY c.order_index ASC`,
            [articleId]
        );

        const contentMap = {};
        contentRows.forEach(row => {
            if (!contentMap[row.content_id]) {
                contentMap[row.content_id] = {
                    content_id: row.content_id,
                    type: row.type,
                    order_index: row.order_index,
                    text_en: '',
                    text_th: '',
                    url: row.content_url || ''
                };
            }
            if (row.language_code === 'en') {
                contentMap[row.content_id].text_en = row.content_text || '';
            } else if (row.language_code === 'th') {
                contentMap[row.content_id].text_th = row.content_text || '';
            }
        });
        lesson.content = Object.values(contentMap).sort((a, b) => a.order_index - b.order_index);

        // 3. Get Quiz
        const [quizRows] = await pool.execute(
            `SELECT q.quiz_id, qt.language_code, qt.title, qt.description
             FROM Quiz q
             LEFT JOIN QuizTranslation qt ON q.quiz_id = qt.quiz_id
             WHERE q.article_id = ?`,
            [articleId]
        );

        if (quizRows.length > 0) {
            const quizId = quizRows[0].quiz_id;
            const quiz = {
                quiz_id: quizId,
                title_en: '',
                description_en: '',
                title_th: '',
                description_th: '',
                questions: []
            };
            quizRows.forEach(row => {
                if (row.language_code === 'en') {
                    quiz.title_en = row.title || '';
                    quiz.description_en = row.description || '';
                } else if (row.language_code === 'th') {
                    quiz.title_th = row.title || '';
                    quiz.description_th = row.description || '';
                }
            });

            // Get Questions
            const [questRows] = await pool.execute(
                `SELECT q.question_id, q.type, q.order_index, qt.language_code, qt.question_text
                 FROM Question q
                 LEFT JOIN QuestionTranslation qt ON q.question_id = qt.question_id
                 WHERE q.quiz_id = ?
                 ORDER BY q.order_index ASC`,
                [quizId]
            );

            const questMap = {};
            questRows.forEach(row => {
                if (!questMap[row.question_id]) {
                    questMap[row.question_id] = {
                        question_id: row.question_id,
                        type: row.type,
                        order_index: row.order_index,
                        question_en: '',
                        question_th: '',
                        choices: []
                    };
                }
                if (row.language_code === 'en') {
                    questMap[row.question_id].question_en = row.question_text || '';
                } else if (row.language_code === 'th') {
                    questMap[row.question_id].question_th = row.question_text || '';
                }
            });

            // Get Choices
            const questionIds = Object.keys(questMap).map(Number);
            if (questionIds.length > 0) {
                const [choiceRows] = await pool.query(
                    `SELECT c.choice_id, c.quest_id, c.order_index, c.is_correct, ct.language_code, ct.choice_text
                     FROM Choice c
                     LEFT JOIN ChoiceTranslation ct ON c.choice_id = ct.choice_id
                     WHERE c.quest_id IN (?)
                     ORDER BY c.order_index ASC`,
                    [questionIds]
                );

                const choiceMap = {};
                choiceRows.forEach(row => {
                    if (!choiceMap[row.choice_id]) {
                        choiceMap[row.choice_id] = {
                            choice_id: row.choice_id,
                            quest_id: row.quest_id,
                            order_index: row.order_index,
                            is_correct: row.is_correct === 1,
                            choice_en: '',
                            choice_th: ''
                        };
                    }
                    if (row.language_code === 'en') {
                        choiceMap[row.choice_id].choice_en = row.choice_text || '';
                    } else if (row.language_code === 'th') {
                        choiceMap[row.choice_id].choice_th = row.choice_text || '';
                    }
                });

                Object.values(choiceMap).forEach(choice => {
                    if (questMap[choice.quest_id]) {
                        questMap[choice.quest_id].choices.push(choice);
                    }
                });
            }

            quiz.questions = Object.values(questMap).sort((a, b) => a.order_index - b.order_index);
            // Sort choices inside questions
            quiz.questions.forEach(q => {
                q.choices.sort((a, b) => a.order_index - b.order_index);
            });
            lesson.quiz = quiz;
        }

        return lesson;
    }

    async createCompleteLesson(data) {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
            const [res] = await connection.execute(`INSERT INTO Article () VALUES ()`);
            const articleId = res.insertId;
            await connection.commit();
            
            // Re-run saveLesson to update translations and components
            await this.saveLesson(articleId, data);
            return articleId;
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    async saveLesson(articleId, data) {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
            // 1. Update Article Translation
            await connection.execute(
                `INSERT INTO ArticleTranslation (article_id, language_code, title, description)
                 VALUES (?, 'en', ?, ?)
                 ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description)`,
                [articleId, data.title_en, data.description_en]
            );
            await connection.execute(
                `INSERT INTO ArticleTranslation (article_id, language_code, title, description)
                 VALUES (?, 'th', ?, ?)
                 ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description)`,
                [articleId, data.title_th, data.description_th]
            );

            // 2. Update Content Boxes
            const currentContentIds = data.content.map(c => c.content_id).filter(Boolean);
            if (currentContentIds.length > 0) {
                await connection.query(
                    `DELETE FROM ContentBox WHERE article_id = ? AND content_id NOT IN (?)`,
                    [articleId, currentContentIds]
                );
            } else {
                await connection.execute(
                    `DELETE FROM ContentBox WHERE article_id = ?`,
                    [articleId]
                );
            }

            for (const item of data.content) {
                let contentId = item.content_id;
                if (contentId) {
                    await connection.execute(
                        `UPDATE ContentBox SET type = ?, order_index = ? WHERE content_id = ?`,
                        [item.type, item.order_index, contentId]
                    );
                } else {
                    const [res] = await connection.execute(
                        `INSERT INTO ContentBox (article_id, type, order_index) VALUES (?, ?, ?)`,
                        [articleId, item.type, item.order_index]
                    );
                    contentId = res.insertId;
                }

                await connection.execute(
                    `INSERT INTO ContentBoxTranslation (content_id, language_code, content_text, content_url)
                     VALUES (?, 'en', ?, ?)
                     ON DUPLICATE KEY UPDATE content_text = VALUES(content_text), content_url = VALUES(content_url)`,
                    [contentId, item.text_en || null, item.url || null]
                );
                await connection.execute(
                    `INSERT INTO ContentBoxTranslation (content_id, language_code, content_text, content_url)
                     VALUES (?, 'th', ?, ?)
                     ON DUPLICATE KEY UPDATE content_text = VALUES(content_text), content_url = VALUES(content_url)`,
                    [contentId, item.text_th || null, item.url || null]
                );
            }

            // 3. Update Quiz
            if (data.quiz) {
                let quizId = data.quiz.quiz_id;
                if (!quizId) {
                    const [existingQuiz] = await connection.execute(
                        `SELECT quiz_id FROM Quiz WHERE article_id = ?`,
                        [articleId]
                    );
                    if (existingQuiz.length > 0) {
                        quizId = existingQuiz[0].quiz_id;
                    } else {
                        const [res] = await connection.execute(
                            `INSERT INTO Quiz (article_id) VALUES (?)`,
                            [articleId]
                        );
                        quizId = res.insertId;
                    }
                }

                await connection.execute(
                    `INSERT INTO QuizTranslation (quiz_id, language_code, title, description)
                     VALUES (?, 'en', ?, ?)
                     ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description)`,
                    [quizId, data.quiz.title_en, data.quiz.description_en]
                );
                await connection.execute(
                    `INSERT INTO QuizTranslation (quiz_id, language_code, title, description)
                     VALUES (?, 'th', ?, ?)
                     ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description)`,
                    [quizId, data.quiz.title_th, data.quiz.description_th]
                );

                // Update Questions
                const currentQuestionIds = data.quiz.questions.map(q => q.question_id).filter(Boolean);
                if (currentQuestionIds.length > 0) {
                    await connection.query(
                        `DELETE FROM Question WHERE quiz_id = ? AND question_id NOT IN (?)`,
                        [quizId, currentQuestionIds]
                    );
                } else {
                    await connection.execute(
                        `DELETE FROM Question WHERE quiz_id = ?`,
                        [quizId]
                    );
                }

                for (const q of data.quiz.questions) {
                    let questionId = q.question_id;
                    if (questionId) {
                        await connection.execute(
                            `UPDATE Question SET type = ?, order_index = ? WHERE question_id = ?`,
                            [q.type, q.order_index, questionId]
                        );
                    } else {
                        const [res] = await connection.execute(
                            `INSERT INTO Question (quiz_id, type, order_index) VALUES (?, ?, ?)`,
                            [quizId, q.type, q.order_index]
                        );
                        questionId = res.insertId;
                    }

                    await connection.execute(
                        `INSERT INTO QuestionTranslation (question_id, language_code, question_text)
                         VALUES (?, 'en', ?)
                         ON DUPLICATE KEY UPDATE question_text = VALUES(question_text)`,
                        [questionId, q.question_en]
                    );
                    await connection.execute(
                        `INSERT INTO QuestionTranslation (question_id, language_code, question_text)
                         VALUES (?, 'th', ?)
                         ON DUPLICATE KEY UPDATE question_text = VALUES(question_text)`,
                        [questionId, q.question_th]
                    );

                    // Update Choices
                    const currentChoiceIds = q.choices.map(c => c.choice_id).filter(Boolean);
                    if (currentChoiceIds.length > 0) {
                        await connection.query(
                            `DELETE FROM Choice WHERE quest_id = ? AND choice_id NOT IN (?)`,
                            [questionId, currentChoiceIds]
                        );
                    } else {
                        await connection.execute(
                            `DELETE FROM Choice WHERE quest_id = ?`,
                            [questionId]
                        );
                    }

                    for (const c of q.choices) {
                        let choiceId = c.choice_id;
                        if (choiceId) {
                            await connection.execute(
                                `UPDATE Choice SET order_index = ?, is_correct = ? WHERE choice_id = ?`,
                                [c.order_index, c.is_correct ? 1 : 0, choiceId]
                            );
                        } else {
                            const [res] = await connection.execute(
                                `INSERT INTO Choice (quest_id, order_index, is_correct) VALUES (?, ?, ?)`,
                                [questionId, c.order_index, c.is_correct ? 1 : 0]
                            );
                            choiceId = res.insertId;
                        }

                        await connection.execute(
                            `INSERT INTO ChoiceTranslation (choice_id, language_code, choice_text)
                             VALUES (?, 'en', ?)
                             ON DUPLICATE KEY UPDATE choice_text = VALUES(choice_text)`,
                            [choiceId, c.choice_en]
                        );
                        await connection.execute(
                            `INSERT INTO ChoiceTranslation (choice_id, language_code, choice_text)
                             VALUES (?, 'th', ?)
                             ON DUPLICATE KEY UPDATE choice_text = VALUES(choice_text)`,
                            [choiceId, c.choice_th]
                        );
                    }
                }
            } else {
                await connection.execute(
                    `DELETE FROM Quiz WHERE article_id = ?`,
                    [articleId]
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

    async deleteLesson(articleId) {
        await pool.execute(`DELETE FROM Article WHERE article_id = ?`, [articleId]);
    }

    async getAllDevices() {
        const [devices] = await pool.execute(
            `SELECT device_id, device_name, password, create_at FROM Device ORDER BY create_at DESC`
        );
        return devices;
    }

    async createDevice(deviceName, password) {
        const [res] = await pool.execute(
            `INSERT INTO Device (device_name, password) VALUES (?, ?)`,
            [deviceName, password]
        );
        return res.insertId;
    }

    async deleteDevice(deviceId) {
        await pool.execute(
            `DELETE FROM Device WHERE device_id = ?`,
            [deviceId]
        );
    }

    async updateDevice(deviceId, deviceName, password) {
        await pool.execute(
            `UPDATE Device SET device_name = ?, password = ? WHERE device_id = ?`,
            [deviceName, password, deviceId]
        );
    }
}

module.exports = new AdminService();
