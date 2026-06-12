const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

// Verifies the HTTP-Only cookie JWT for the frontend/learning domain
const requireUser = (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role }
        next();
    } catch (err) {
        logger.warn('Failed JWT verification attempt');
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

// Optional user authentication: verifies JWT cookie, but does not block anonymous users
const optionalUser = (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role }
        next();
    } catch (err) {
        req.user = null;
        next();
    }
};

// Verifies the Bearer token for the IoT/Device domain
const requireDevice = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Device token required' });
    }

    const token = authHeader.split(' ')[1];
    
    // In a real system, you'd check this token against a database of valid device tokens.
    // For this boilerplate, we'll accept a static device token defined in .env
    const isProduction = process.env.NODE_ENV === 'production';
    const isTestTokenAllowed = !isProduction && token === 'TEST_DEVICE_TOKEN';
    
    if (token !== process.env.DEVICE_TOKEN_SECRET && !isTestTokenAllowed) {
        logger.warn('Failed device token verification attempt');
        return res.status(401).json({ error: 'Unauthorized: Invalid device token' });
    }
    
    req.device = { authenticated: true };
    next();
};

// Verifies the HTTP-Only cookie JWT and strictly requires 'instructor' or 'admin' role
const requireInstructor = (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'instructor' && decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Requires instructor privileges' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        logger.warn('Failed JWT instructor verification attempt');
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

module.exports = {
    requireUser,
    optionalUser,
    requireDevice,
    requireInstructor
};
