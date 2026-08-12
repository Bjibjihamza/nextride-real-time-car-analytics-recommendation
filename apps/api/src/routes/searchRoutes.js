const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Search cars with filters
router.post('/', searchController.searchCars);

// Get user's search history
router.get('/history', searchController.getSearchHistory);

module.exports = router;