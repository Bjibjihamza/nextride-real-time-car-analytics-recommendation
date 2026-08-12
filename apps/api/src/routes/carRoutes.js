const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../images/cars/temp'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG/PNG images are allowed'));
  }
});

const tempDir = path.join(__dirname, '../../images/cars/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

router.get('/brands', carController.getCarsByBrand);
router.get('/bubbles', carController.getCarBubbles);
router.get('/:id', carController.getCarById);
router.get('/', carController.getAllCars);
router.get('/latest', carController.getLatestCars);
router.get('/recently-viewed', carController.getRecentlyViewed);
router.post('/view', carController.recordCarView);
router.post('/', upload.array('images', 10), carController.createCar);

module.exports = router;