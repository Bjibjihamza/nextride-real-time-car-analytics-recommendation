const client = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');



class User {
  // Create a new user
// In User.js
static async create(userData) {
  const userId = uuidv4();
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  const query = `
    INSERT INTO users (
      user_id, 
      username, 
      email, 
      password,  // Changed from password_hash to password
      age,
      location,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    userId,
    userData.username,
    userData.email,
    hashedPassword,
    userData.age || null,
    userData.location || null,
    new Date()
  ];
  
  try {
    await client.execute(query, params, { prepare: true });
    return { userId, ...userData, password: undefined };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

static async getById(userId) {
  const query = 'SELECT * FROM users WHERE user_id = ?';
  try {
    const result = await client.execute(query, [userId], { prepare: true });
    const user = result.first();
    if (user) {
      delete user.password;  // Changed from password_hash to password
    }
    return user;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    throw error;
  }
}


  


  
  // Get user by email
  static async getByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ? ALLOW FILTERING';
    try {
      const result = await client.execute(query, [email], { prepare: true });
      return result.first();
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  }
  
  // Update user
  static async update(userId, userData) {
    // Build update query dynamically based on provided fields
    let queryParts = [];
    let params = [];
    
    Object.keys(userData).forEach(key => {
      if (key !== 'user_id' && key !== 'created_at' && userData[key] !== undefined) {
        queryParts.push(`${key} = ?`);
        params.push(userData[key]);
      }
    });
    
    if (queryParts.length === 0) {
      return await this.getById(userId);
    }
    
    const query = `UPDATE users SET ${queryParts.join(', ')} WHERE user_id = ?`;
    params.push(userId);
    
    try {
      await client.execute(query, params, { prepare: true });
      return await this.getById(userId);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
  
  // Get user's favorite cars
  static async getFavoriteCars(userId, limit = 10) {
    const query = `
      SELECT * FROM favorite_cars_by_user 
      WHERE user_id = ? 
      LIMIT ?
    `;
    
    try {
      const result = await client.execute(query, [userId, limit], { prepare: true });
      return result.rows;
    } catch (error) {
      console.error('Error fetching favorite cars:', error);
      throw error;
    }
  }
  
  // Add car to favorites
  static async addFavoriteCar(userId, carId) {
    const query = `
      INSERT INTO favorite_cars_by_user (
        user_id, 
        added_date, 
        added_timestamp, 
        car_id
      ) VALUES (?, ?, ?, ?)
    `;
    
    const now = new Date();
    const addedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    try {
      await client.execute(query, [userId, addedDate, now, carId], { prepare: true });
      return true;
    } catch (error) {
      console.error('Error adding car to favorites:', error);
      throw error;
    }
  }
  
  // Remove car from favorites
  static async removeFavoriteCar(userId, carId) {
    const findQuery = `
      SELECT added_timestamp FROM favorite_cars_by_user 
      WHERE user_id = ? AND car_id = ? 
      ALLOW FILTERING
    `;

    try {
      const result = await client.execute(findQuery, [userId, carId], { prepare: true });
      const favorite = result.first();

      if (!favorite) {
        return false;
      }

      const deleteQuery = `
        DELETE FROM favorite_cars_by_user 
        WHERE user_id = ? AND added_timestamp = ?
      `;

      await client.execute(deleteQuery, [userId, favorite.added_timestamp], { prepare: true });
      return true;
    } catch (error) {
      console.error('Error removing car from favorites:', error);
      throw error;
    }
  }
  
  // Get user's search history
  static async getSearchHistory(userId, limit = 10) {
    const query = `
      SELECT * FROM user_searches 
      WHERE user_id = ? 
      LIMIT ?
    `;
    
    try {
      const result = await client.execute(query, [userId, limit], { prepare: true });
      return result.rows;
    } catch (error) {
      console.error('Error fetching search history:', error);
      throw error;
    }
  }
  
  // Get user's recommendations
  static async getRecommendations(userId, limit = 10) {
    const query = `
      SELECT * FROM user_recommendations 
      WHERE user_id = ? 
      LIMIT ?
    `;
    
    try {
      const result = await client.execute(query, [userId, limit], { prepare: true });
      return result.rows;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  }

  static async removeFavorite(userId, carId) {
    try {
      const userUuid = types.Uuid.fromString(userId);
      const carUuid = types.Uuid.fromString(carId);

      // Locate the favorite row first so we can delete by the primary key.
      const findQuery = `
        SELECT added_timestamp
        FROM cars_keyspace.favorite_cars_by_user
        WHERE user_id = ? AND car_id = ? ALLOW FILTERING
      `;
      const findResult = await client.execute(findQuery, [userUuid, carUuid], { prepare: true });
      const favorite = findResult.first();
      if (!favorite) {
        return false;
      }

      const query = 'DELETE FROM cars_keyspace.favorite_cars_by_user WHERE user_id = ? AND added_timestamp = ?';
      await client.execute(query, [userUuid, favorite.added_timestamp], { prepare: true });
      return true;
    } catch (error) {
      console.error('Error in removeFavorite:', error.message, 'carId:', carId);
      throw new Error('Invalid ID format');
    }
  }

  static async getFavoritesByUserId(userId) {
    try {
      const userUuid = types.Uuid.fromString(userId);
      const query = 'SELECT car_id FROM cars_keyspace.favorite_cars_by_user WHERE user_id = ?';
      const result = await client.execute(query, [userUuid], { prepare: true });
      const carIds = result.rows.map(row => row.car_id.toString());
      if (carIds.length === 0) return [];
  
      const cars = [];
      for (const carId of carIds) {
        try {
          const car = await this.getById(carId);
          if (car) cars.push(car);
        } catch (error) {
          console.error(`Skipping invalid car ID ${carId}:`, error.message);
        }
      }
      return cars;
    } catch (error) {
      console.error('Error in getFavoritesByUserId:', error.message);
      return [];
    }
  }
}



module.exports = User;