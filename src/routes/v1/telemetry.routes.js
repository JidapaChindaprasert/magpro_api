const express = require('express');
const { body } = require('express-validator');
const telemetryController = require('../../controllers/telemetry.controller');
const validateRequest = require('../../middleware/validate');
const { requireDevice, requireUser, requireInstructor, optionalUser } = require('../../middleware/auth');

const router = express.Router();

// 1. High frequency insertion (Requires Device Token)
router.post(
    '/data',
    requireDevice,
    [
        body().isArray().withMessage('Payload must be an array of telemetry objects'),
        body('*.connected_id').isInt().withMessage('connected_id must be an integer'),
        body('*.magnetic_field').isFloat().withMessage('magnetic_field must be a float'),
        body('*.voltage').isFloat().withMessage('voltage must be a float')
    ],
    validateRequest,
    telemetryController.batchInsertTelemetry
);

// 2. Fetching Data (Requires Student/User JWT, optional for guest users)
router.get(
    '/live/:connected_id',
    optionalUser,
    telemetryController.getLiveTelemetry
);

router.get(
    '/latest/:connected_id',
    optionalUser,
    telemetryController.getLatestTelemetry
);

router.get(
    '/session/:connected_id',
    optionalUser,
    telemetryController.getSessionTelemetry
);

// 3. Modifying Past Sensor Data (Requires Instructor)
router.put(
    '/data/:device_data_id',
    requireInstructor,
    [
        body('magnetic_field').isFloat(),
        body('voltage').isFloat()
    ],
    validateRequest,
    telemetryController.updateTelemetryData
);

module.exports = router;
