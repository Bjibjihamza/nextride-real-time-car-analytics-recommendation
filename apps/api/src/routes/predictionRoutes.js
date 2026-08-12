const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');

// Predict car price
router.post('/', predictionController.predictPrice);

// Get user's prediction history
router.get('/history', predictionController.getPredictionHistory);


module.exports = router;