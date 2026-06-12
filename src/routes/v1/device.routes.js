const express = require('express');
const { body } = require('express-validator');
const deviceController = require('../../controllers/device.controller');
const validateRequest = require('../../middleware/validate');
const { requireDevice, requireUser, optionalUser } = require('../../middleware/auth');

const router = express.Router();

// 1. Connect a new session (Requires Device Token)
router.post(
    '/connect',
    requireDevice,
    [
        body('user_id').isInt().withMessage('user_id must be an integer'),
        body('device_id').isInt().withMessage('device_id must be an integer'),
        body('type').isIn(['bluetooth', 'wifi']).withMessage('type must be bluetooth or wifi')
    ],
    validateRequest,
    deviceController.connectDevice
);

// 2. Disconnect a session (Requires Device Token)
router.post(
    '/disconnect/:connected_id',
    requireDevice,
    deviceController.disconnectDevice
);

// 3. Fetch summary (Requires Student/User JWT)
router.get(
    '/summary/:connected_id',
    requireUser,
    deviceController.getSessionSummary
);

// 4. Authenticate and connect a device session (Requires User JWT, optional for guest users)
router.post(
    '/user-connect',
    optionalUser,
    [
        body('deviceName').isString().notEmpty().withMessage('deviceName is required'),
        body('password').isString().notEmpty().withMessage('password is required'),
        body('type').isIn(['bluetooth', 'wifi']).withMessage('type must be bluetooth or wifi')
    ],
    validateRequest,
    deviceController.userConnectDevice
);

module.exports = router;
