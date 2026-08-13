const Car = require('../models/Car');
const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

exports.searchCars = async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId;
    const {
      searchTerm,
      brand,
      model,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
      fuelType,
      transmission,
      doorCount,
      sellerCity,
      sector,
      page = 1,
      limit = 10
    } = req.body;

    // Prepare filters for the Car.search method
    const filters = {
      searchTerm, // Add searchTerm to filters
      brand,
      model,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
      minYear: minYear ? parseInt(minYear) : undefined,
      maxYear: maxYear ? parseInt(maxYear) : undefined,
      fuelType,
      transmission,
      doorCount: doorCount ? parseInt(doorCount) : undefined,
      sellerCity,
      sector
    };

    // Perform search using Car model with error handling
    let cars = [];
    let total = 0;
    try {
      const result = await Car.search({ ...filters, page, limit });
      cars = result.cars;
      total = result.total;
    } catch (searchError) {
      console.error('Error in search method:', searchError);
      cars = [];
    }

    // If user is logged in, store search in user_searches
    if (userId) {
      try {
        // Prepare a clean filters object for Cassandra (remove undefined/null values)
        const cleanFilters = Object.fromEntries(
          Object.entries({
            searchTerm,
            brand,
            model,
            minPrice: minPrice ? parseInt(minPrice) : undefined,
            maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
            minYear: minYear ? parseInt(minYear) : undefined,
            maxYear: maxYear ? parseInt(maxYear) : undefined,
            fuelType,
            transmission,
            doorCount: doorCount ? parseInt(doorCount) : undefined,
            sellerCity,
            sector
          }).filter(([_, value]) => value !== undefined && value !== null)
        );

        // Create the search query string
        const searchQuery = Object.entries(cleanFilters)
          .map(([key, value]) => `${key}=${value}`)
          .join('&');

        const query = `
          INSERT INTO user_searches (
            user_id,
            search_timestamp,
            search_query,
            filters,
            result_count
          ) VALUES ($1, now(), $2, $3, $4)
        `;
        const params = [
          userId,
          searchQuery,
          cleanFilters, // jsonb — pg serialises objects automatically
          total
        ];

        await pool.query(query, params);
      } catch (historyError) {
        console.error('Error storing search history:', historyError);
        // Continue even if search history storage fails
      }
    }

    res.status(200).json({
      message: 'Search completed successfully',
      cars,
      page: parseInt(page),
      limit: parseInt(limit),
      total
    });
  } catch (error) {
    console.error('Error searching cars:', error);
    res.status(500).json({ 
      message: 'Error performing search',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's search history
exports.getSearchHistory = async (req, res) => {
  try {
    const userId = req.body.userId || req.params.userId || req.query.userId;
    const limit = parseInt(req.query.limit) || 10;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const query = `
      SELECT search_timestamp, search_query, filters, result_count
      FROM user_searches
      WHERE user_id = $1
      ORDER BY search_timestamp DESC
      LIMIT $2
    `;
    const params = [userId, limit];

    const result = await pool.query(query, params);
    const searches = result.rows;

    res.status(200).json({
      message: 'Search history retrieved successfully',
      searches,
      count: searches.length
    });
  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({ message: 'Error retrieving search history' });
  }
};