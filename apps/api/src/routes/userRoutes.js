const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware); // Apply authMiddleware to all routes

router.get('/', userController.getUser);
router.put('/', userController.updateUser);
router.get('/preferences', userController.getPreferences);
router.put('/preferences', userController.updatePreferences);
router.get('/favorites', userController.getFavorites);
router.post('/favorites', userController.addFavorite);
router.delete('/favorites', userController.removeFavorite);
router.get('/recommendations', userController.getRecommendations);
router.get('/recommendations/generate', userController.generateRecommendations);

module.exports = router;