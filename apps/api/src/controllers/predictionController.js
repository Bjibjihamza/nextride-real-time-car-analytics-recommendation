const client = require('../config/db');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

exports.predictPrice = async (req, res) => {
  try {
    const {
      userId, brand, model, year, mileage, fuel_type, transmission,
      fiscal_power, door_count, first_owner, origin, seller_city, condition, equipment,
      publication_date, sector
    } = req.body;

    // Validate required fields
    if (!userId || !brand || !year || !mileage || !fuel_type || !transmission || !fiscal_power) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Prepare raw data for Flask API
    const features = {
      brand,
      condition: condition || '',
      door_count: parseInt(door_count) || 4,
      equipment: equipment || '',
      first_owner: first_owner ? 'Oui' : 'Non',
      fiscal_power: parseInt(fiscal_power),
      fuel_type,
      mileage: parseInt(mileage),
      model: model || 'Unknown',
      origin: origin || '',
      sector: sector || 'Unknown',
      seller_city: seller_city || '',
      transmission,
      year: parseInt(year),
      publication_date: publication_date || '11/05/2025 00:00'
    };

    // Call Flask ML service
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001/predict';
    let predictedPrice;
    try {
      const response = await axios.post(mlServiceUrl, features);
      predictedPrice = response.data.prediction.predictedPrice; // Fixed parsing
      if (!predictedPrice) {
        throw new Error('Invalid response from ML service: predictedPrice missing');
      }
    } catch (mlError) {
      console.error('Error calling ML service:', mlError.message);
      return res.status(500).json({ message: 'Error generating price prediction', error: mlError.message });
    }

    // Convert car_features to a JSON string for Cassandra
    const carFeatures = JSON.stringify(req.body);

    // Store prediction in Cassandra
    const predictionId = uuidv4();
    const query = `
      INSERT INTO car_predictions (
        prediction_id,
        user_id,
        car_features,
        predicted_price,
        prediction_timestamp
      ) VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      predictionId,
      userId,
      carFeatures,
      predictedPrice,
      new Date()
    ];

    await client.execute(query, params, { prepare: true });

    res.status(200).json({
      message: 'Price predicted successfully',
      prediction: {
        predictionId,
        userId,
        features: req.body,
        predictedPrice,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error predicting price:', error);
    res.status(500).json({ message: 'Error processing prediction request', error: error.message });
  }
};

// getPredictionHistory remains unchanged
exports.getPredictionHistory = async (req, res) => {
  try {
    const userId = req.body.userId || req.params.userId || req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const query = `
      SELECT * FROM car_predictions
      WHERE user_id = ?
      LIMIT ?
    `;
    const params = [userId, limit];

    const result = await client.execute(query, params, { prepare: true });
    const predictions = result.rows;

    res.status(200).json({
      message: 'Prediction history retrieved successfully',
      predictions,
      page,
      limit,
      count: predictions.length
    });
  } catch (error) {
    console.error('Error fetching prediction history:', error);
    res.status(500).json({ message: 'Error retrieving prediction history', error: error.message });
  }
};