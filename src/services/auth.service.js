const argon2 = require('argon2');
const pool = require('../config/db');

class AuthService {
    async findUserByEmail(email) {
        const [rows] = await pool.execute(
            'SELECT user_id, role, password, firstname, lastname FROM User WHERE email = ? LIMIT 1',
            [email]
        );
        return rows[0];
    }

    async updateLastLogin(userId) {
        await pool.execute(
            'UPDATE User SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
            [userId]
        );
    }

    async verifyPassword(hash, plainText) {
        try {
            return await argon2.verify(hash, plainText);
        } catch (err) {
            throw new Error('Password verification failed');
        }
    }

    async hashPassword(plainText) {
        return await argon2.hash(plainText);
    }

    async registerStudent({ email, password, firstname, lastname, studentId, prefix = null, nickname = null, gender = null }) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Check email uniqueness
            const [existingEmail] = await connection.execute(
                'SELECT user_id FROM User WHERE email = ? LIMIT 1',
                [email]
            );
            if (existingEmail.length > 0) {
                throw new Error('Email is already registered');
            }

            // Check studentId uniqueness
            const [existingStudentId] = await connection.execute(
                'SELECT user_id FROM Student WHERE student_id = ? LIMIT 1',
                [studentId]
            );
            if (existingStudentId.length > 0) {
                throw new Error('Student ID is already registered');
            }

            // Hash password
            const passwordHash = await this.hashPassword(password);

            // Insert User
            const [userResult] = await connection.execute(
                'INSERT INTO User (role, prefix, firstname, lastname, nickname, gender, email, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                ['student', prefix, firstname, lastname, nickname, gender, email, passwordHash]
            );
            const userId = userResult.insertId;

            // Insert Student
            await connection.execute(
                'INSERT INTO Student (user_id, student_id) VALUES (?, ?)',
                [userId, studentId]
            );

            await connection.commit();
            return { user_id: userId, email, role: 'student', firstname, lastname };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }
}

module.exports = new AuthService();
