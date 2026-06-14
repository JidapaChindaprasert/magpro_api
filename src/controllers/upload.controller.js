const path = require('path');
const logger = require('../config/logger');

const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        
        // The file is saved in the /uploads folder by multer
        // We will serve the uploads folder as /api/v1/static
        const fileUrl = `/api/v1/static/${req.file.filename}`;
        
        res.status(200).json({
            message: 'File uploaded successfully',
            url: fileUrl
        });
    } catch (err) {
        logger.error('File upload error: ', err);
        next(err);
    }
};

module.exports = {
    uploadFile
};
