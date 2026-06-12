const pool = require('../config/db');
const logger = require('../config/logger');

const connectDevice = async (req, res, next) => {
    try {
        const { user_id, device_id, type } = req.body;

        const [result] = await pool.execute(
            'INSERT INTO ConnectedDevice (user_id, device_id, type) VALUES (?, ?, ?)',
            [user_id, device_id, type]
        );

        logger.info({ connected_id: result.insertId }, 'Device connected');

        res.status(201).json({
            success: true,
            data: {
                connected_id: result.insertId
            }
        });
    } catch (err) {
        next(err);
    }
};

const disconnectDevice = async (req, res, next) => {
    try {
        const { connected_id } = req.params;
        await pool.execute(
            'UPDATE ConnectedDevice SET disconnect_at = CURRENT_TIMESTAMP WHERE connected_id = ?',
            [connected_id]
        );
        res.status(200).json({ success: true, message: 'Device disconnected and session sealed.' });
    } catch (err) {
        next(err);
    }
};

const getSessionSummary = async (req, res, next) => {
    try {
        const { connected_id } = req.params;
        const [rows] = await pool.execute(
            'SELECT * FROM v_student_session_summary WHERE connected_id = ?',
            [connected_id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Session summary not found' });
        }

        res.status(200).json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const userConnectDevice = async (req, res, next) => {
    try {
        const { deviceName, password, type } = req.body;
        const userId = req.user ? req.user.id : 1; // Fallback to guest student user (id=1)

        let deviceId;
        if (type === 'bluetooth') {
            // For bluetooth, check if the device name exists or create it on the fly
            const [existing] = await pool.execute(
                'SELECT device_id FROM Device WHERE device_name = ?',
                [deviceName]
            );
            if (existing.length > 0) {
                deviceId = existing[0].device_id;
            } else {
                const [result] = await pool.execute(
                    'INSERT INTO Device (device_name, password) VALUES (?, ?)',
                    [deviceName, 'bluetooth']
                );
                deviceId = result.insertId;
            }
        } else {
            // 1. Verify device exists and matches password for Wifi
            const [devices] = await pool.execute(
                'SELECT device_id FROM Device WHERE device_name = ? AND password = ?',
                [deviceName, password]
            );

            if (devices.length === 0) {
                return res.status(401).json({ success: false, error: 'Invalid device name or password' });
            }

            deviceId = devices[0].device_id;
        }

        // 2. Ensure user is a student (foreign key constraint)
        const [students] = await pool.execute(
            'SELECT user_id FROM Student WHERE user_id = ?',
            [userId]
        );
        if (students.length === 0) {
            await pool.execute(
                'INSERT IGNORE INTO Student (user_id, student_id) VALUES (?, ?)',
                [userId, 'ADM' + userId]
            );
        }

        // 3. Check for existing active connection
        const [connections] = await pool.execute(
            'SELECT connected_id FROM ConnectedDevice WHERE user_id = ? AND device_id = ? AND type = ? AND disconnect_at IS NULL LIMIT 1',
            [userId, deviceId, type]
        );

        if (connections.length > 0) {
            return res.status(200).json({
                success: true,
                data: {
                    connected_id: connections[0].connected_id
                }
            });
        }

        // 4. Create new connection
        const [result] = await pool.execute(
            'INSERT INTO ConnectedDevice (user_id, device_id, type) VALUES (?, ?, ?)',
            [userId, deviceId, type]
        );

        logger.info({ connected_id: result.insertId, userId, deviceId }, 'User connected device');

        res.status(201).json({
            success: true,
            data: {
                connected_id: result.insertId
            }
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    connectDevice,
    disconnectDevice,
    getSessionSummary,
    userConnectDevice
};
