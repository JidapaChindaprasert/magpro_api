const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service');
const logger = require('../config/logger');

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1. Find User
        const user = await authService.findUserByEmail(email);
        if (!user) {
            logger.warn({ email }, 'Failed login attempt: User not found');
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // 2. Verify Password
        // Note: For existing seed data, 'aaaaaa' was inserted as plain text. 
        // In a real scenario, the DB should contain Argon2 hashes.
        // We'll simulate verification assuming passwords are Argon2 hashed in production.
        let isValid = false;
        try {
            isValid = await authService.verifyPassword(user.password, password);
        } catch(err) {
            // Fallback for seed data (DEVELOPMENT ONLY)
            if (process.env.NODE_ENV === 'development' && user.password === password) {
                isValid = true;
            }
        }

        if (!isValid) {
            logger.warn({ email }, 'Failed login attempt: Incorrect password');
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // 3. Update last login
        await authService.updateLastLogin(user.user_id);

        // 4. Generate JWT
        const payload = {
            id: user.user_id,
            role: user.role
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // 5. Send secure cookie
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour
        });

        logger.info({ user_id: user.user_id }, 'User logged in successfully');

        return res.status(200).json({
            success: true,
            data: {
                id: user.user_id,
                firstname: user.firstname,
                role: user.role
            }
        });
    } catch (err) {
        next(err);
    }
};

const logout = (req, res) => {
    res.clearCookie('jwt', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
};

const register = async (req, res, next) => {
    try {
        const { email, password, firstname, lastname, studentId, prefix, nickname, gender } = req.body;

        // Create user
        const newUser = await authService.registerStudent({
            email,
            password,
            firstname,
            lastname,
            studentId,
            prefix,
            nickname,
            gender
        });

        // Generate JWT
        const payload = {
            id: newUser.user_id,
            role: newUser.role
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Send secure cookie
        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour
        });

        logger.info({ user_id: newUser.user_id }, 'New user registered and logged in successfully');

        return res.status(201).json({
            success: true,
            data: {
                id: newUser.user_id,
                firstname: newUser.firstname,
                role: newUser.role
            }
        });
    } catch (err) {
        if (err.message === 'Email is already registered' || err.message === 'Student ID is already registered') {
            return res.status(400).json({ success: false, error: err.message });
        }
        next(err);
    }
};

module.exports = {
    login,
    logout,
    register
};
