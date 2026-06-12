const pool = require('../config/db');

const batchInsertTelemetry = async (req, res, next) => {
    try {
        const payload = req.body; // Expecting an array of sensor objects
        
        if (!Array.isArray(payload) || payload.length === 0) {
            return res.status(400).json({ success: false, error: 'Expected a non-empty array of telemetry data' });
        }

        // Construct the bulk insert query
        // INSERT INTO DeviceData (connected_id, magnetic_field, raw, voltage) VALUES (?, ?, ?, ?), (?, ?, ?, ?) ...
        let placeholders = [];
        let values = [];

        payload.forEach(item => {
            placeholders.push('(?, ?, ?, ?)');
            values.push(item.connected_id, item.magnetic_field, item.raw || null, item.voltage);
        });

        const sql = `INSERT INTO DeviceData (connected_id, magnetic_field, raw, voltage) VALUES ${placeholders.join(', ')}`;
        
        await pool.query(sql, values); // Note: bulk insert with dynamic array requires query() instead of execute()

        res.status(201).json({
            success: true,
            message: `Successfully batched ${payload.length} readings.`
        });
    } catch (err) {
        next(err);
    }
};

const getLiveTelemetry = async (req, res, next) => {
    try {
        const { connected_id } = req.params;
        const [rows] = await pool.execute(
            'SELECT magnetic_field, voltage, create_at FROM DeviceData WHERE connected_id = ? ORDER BY create_at DESC LIMIT 100',
            [connected_id]
        );
        res.status(200).json({ success: true, data: rows.reverse() }); // Reverse so oldest is first in the graph
    } catch (err) {
        next(err);
    }
};

const getLatestTelemetry = async (req, res, next) => {
    try {
        const { connected_id } = req.params;
        const [rows] = await pool.execute(
            'SELECT magnetic_field, voltage, create_at FROM DeviceData WHERE connected_id = ? ORDER BY create_at DESC LIMIT 1',
            [connected_id]
        );
        if (rows.length === 0) {
            return res.status(200).json({ success: true, data: null });
        }
        res.status(200).json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

const getSessionTelemetry = async (req, res, next) => {
    try {
        const { connected_id } = req.params;
        const [rows] = await pool.execute(
            'SELECT * FROM v_experiment_readings WHERE connected_id = ?',
            [connected_id]
        );
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

const updateTelemetryData = async (req, res, next) => {
    try {
        const { device_data_id } = req.params;
        const { magnetic_field, voltage } = req.body;
        
        await pool.execute(
            'UPDATE DeviceData SET magnetic_field = ?, voltage = ? WHERE data_id = ?',
            [magnetic_field, voltage, device_data_id]
        );
        
        res.status(200).json({ success: true, message: 'Sensor reading updated securely.' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    batchInsertTelemetry,
    getLiveTelemetry,
    getLatestTelemetry,
    getSessionTelemetry,
    updateTelemetryData
};
