const Car = require('../models/Car');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Ensure the images/cars directory exists
const uploadDir = path.join(__dirname, '../../images/cars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Get a car by ID
exports.getCarById = async (req, res) => {
  try {
    const carId = req.params.id;

    const car = await Car.getById(carId);
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    // Record view if user is logged in
    const userId = req.body.userId || req.query.userId;
    if (userId) {
      await Car.recordView(userId, carId, 'detail_page');
    }

    res.status(200).json({ car });
  } catch (error) {
    console.error('Error fetching car by ID:', error);
    res.status(500).json({ message: 'Error fetching car details' });
  }
};

exports.getAllCars = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const { cars, total } = await Car.getAll(page, limit);

    res.status(200).json({ cars, page, limit, total });
  } catch (error) {
    console.error('Error fetching all cars:', error);
    res.status(500).json({ message: 'Error fetching cars' });
  }
};

// Get latest cars
exports.getLatestCars = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const latestCars = await Car.getLatest(limit);
    res.status(200).json({ cars: latestCars, count: latestCars.length });
  } catch (error) {
    console.error('Error fetching latest cars:', error.message, error.stack);
    res.status(500).json({ message: 'Error fetching latest cars', error: error.message });
  }
};

// Get recently viewed cars for a user
exports.getRecentlyViewed = async (req, res) => {
  try {
    const userId = req.body.userId || req.params.userId || req.query.userId;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const limit = parseInt(req.query.limit) || 5;
    const recentlyViewed = await Car.getRecentlyViewed(userId, limit);

    res.status(200).json({ cars: recentlyViewed, count: recentlyViewed.length });
  } catch (error) {
    console.error('Error fetching recently viewed cars:', error);
    res.status(500).json({ message: 'Error fetching recently viewed cars' });
  }
};

// Record car view
exports.recordCarView = async (req, res) => {
  try {
    const { userId, carId, viewSource } = req.body;
    if (!userId || !carId || !viewSource) {
      return res.status(400).json({ message: 'User ID, Car ID, and View Source are required' });
    }

    await Car.recordView(userId, carId, viewSource);
    res.status(200).json({ message: 'Car view recorded' });
  } catch (error) {
    console.error('Error recording car view:', error.message, error.stack);
    res.status(500).json({ message: 'Error recording car view', error: error.message });
  }
};

// Create a new car listing
exports.createCar = async (req, res) => {
  try {
    const {
      brand, model, condition, year, mileage, fuel_type, transmission,
      fiscal_power, door_count, first_owner, origin, seller_city, sector,
      price, title, equipment
    } = req.body;

    const requiredFields = [
      'brand', 'model', 'condition', 'year', 'mileage', 'fuel_type', 'transmission',
      'fiscal_power', 'door_count', 'origin', 'seller_city', 'sector', 'price', 'title'
    ];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ message: `Missing required field: ${field}` });
      }
    }

    if (year < 1980 || year > 2025) {
      return res.status(400).json({ message: 'Year must be between 1980 and 2025' });
    }
    if (mileage < 0) {
      return res.status(400).json({ message: 'Mileage cannot be negative' });
    }
    if (fiscal_power < 1 || fiscal_power > 40) {
      return res.status(400).json({ message: 'Fiscal power must be between 1 and 40' });
    }
    if (price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }
    if (files.length > 10) {
      return res.status(400).json({ message: 'Maximum 10 images allowed' });
    }

    const imageFolder = uuidv4();
    const carImageDir = path.join(uploadDir, imageFolder);
    fs.mkdirSync(carImageDir, { recursive: true });

    files.forEach((file, index) => {
      const newPath = path.join(carImageDir, `image_${index + 1}${path.extname(file.originalname)}`);
      fs.renameSync(file.path, newPath);
    });

    const publicationDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const car = await Car.create({
      brand: String(brand),
      model: String(model),
      title: String(title),
      price: parseInt(price),
      fuel_type: String(fuel_type),
      transmission: String(transmission),
      year: parseInt(year),
      door_count: parseInt(door_count),
      seller_city: String(seller_city),
      sector: String(sector),
      publication_date: publicationDate,
      condition: String(condition),
      equipment: equipment ? String(equipment) : '',
      first_owner: (first_owner === 'true' || first_owner === true) ? 'true' : 'false',
      fiscal_power: parseInt(fiscal_power),
      image_folder: imageFolder,
      mileage: parseInt(mileage),
      origin: String(origin),
      creator: 'anonymous',
    });

    res.status(201).json({
      message: 'Car created successfully',
      car: {
        ...car,
        image_url: `/images/cars/${imageFolder}/image_1.jpg`,
      },
    });
  } catch (error) {
    console.error('Error creating car:', error);
    res.status(500).json({ message: 'Error creating car', error: error.message });
  }
};

// Get brand distribution (bar chart)
exports.getCarsByBrand = async (req, res) => {
  try {
    const { yearMin, yearMax, fuelType } = req.query;
    if (yearMin && yearMax && parseInt(yearMin) > parseInt(yearMax)) {
      return res.status(400).json({ message: 'yearMin cannot be greater than yearMax' });
    }
    const data = await Car.getBrandDistribution({ yearMin, yearMax, fuelType });
    res.status(200).json({ data });
  } catch (error) {
    console.error('Error fetching brand distribution:', error);
    res.status(500).json({ message: 'Error fetching brand distribution' });
  }
};

// Get car data for bubble chart
exports.getCarBubbles = async (req, res) => {
  try {
    const { yearMin, yearMax, maxPrice, fuelType } = req.query;
    if (yearMin && yearMax && parseInt(yearMin) > parseInt(yearMax)) {
      return res.status(400).json({ message: 'yearMin cannot be greater than yearMax' });
    }
    const data = await Car.getCarBubbles({ yearMin, yearMax, maxPrice, fuelType });
    res.status(200).json({ data });
  } catch (error) {
    console.error('Error fetching car bubble data:', error);
    res.status(500).json({ message: 'Error fetching car bubble data' });
  }
};
