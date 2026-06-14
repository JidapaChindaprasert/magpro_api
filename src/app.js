const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const logger = require('./config/logger');

const app = express();

// Security Middlewares
app.use(helmet()); // Secure HTTP Headers
app.use(cors({
    origin: ['http://localhost:8080', 'http://localhost:5173', 'http://127.0.0.1:5173'], // Configure this to your frontend origin
    credentials: true, // Allows secure cookies to be sent
    optionsSuccessStatus: 200
}));

app.use(express.json()); // Parse JSON bodies
app.use(cookieParser()); // Parse cookies

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Serve static uploaded files
app.use('/api/v1/static', express.static(path.join(__dirname, '../uploads')));

const authRoutes = require('./routes/v1/auth.routes');
const dashboardRoutes = require('./routes/v1/dashboard.routes');
const deviceRoutes = require('./routes/v1/device.routes');
const telemetryRoutes = require('./routes/v1/telemetry.routes');
const adminRoutes = require('./routes/v1/admin.routes');
const trackingRoutes = require('./routes/v1/tracking.routes');
const lessonRoutes = require('./routes/v1/lesson.routes');
const quizRoutes = require('./routes/v1/quiz.routes');
const uploadRoutes = require('./routes/v1/upload.routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/device', deviceRoutes);
app.use('/api/v1/telemetry', telemetryRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/tracking', trackingRoutes);
app.use('/api/v1/lesson', lessonRoutes);
app.use('/api/v1/quiz', quizRoutes);
app.use('/api/v1/upload', uploadRoutes);

// Global Error Handler
const errorHandler = require('./middleware/error');
app.use(errorHandler);

module.exports = app;
