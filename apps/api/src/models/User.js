const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class User {
  // Create a new user
  static async create(userData) {
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const result = await pool.query(
      `INSERT INTO users (user_id, username, email, password, age, location, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_id, username, email, age, location, created_at`,
      [
        userId,
        userData.username,
        userData.email,
        hashedPassword,
        userData.age || null,
        userData.location || null,
        new Date(),
      ]
    );
    const row = result.rows[0];
    return { ...row, userId: row.user_id };
  }

  static async getById(userId) {
    const result = await pool.query(
      `SELECT user_id, username, email, age, location, created_at
       FROM users WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  static async getByEmail(email) {
    const result = await pool.query(
      `SELECT user_id, username, email, password, age, location, created_at
       FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0] || null;
  }

  static async update(userId, userData) {
    const fields = [];
    const params = [];
    const allowed = ['username', 'email', 'age', 'location', 'password'];

    Object.entries(userData).forEach(([key, value]) => {
      if (allowed.includes(key) && value !== undefined) {
        if (key === 'password' && value) {
          params.push(bcrypt.hashSync(value, 10));
        } else {
          params.push(value);
        }
        fields.push(`${key} = $${params.length}`);
      }
    });

    if (fields.length === 0) {
      return this.getById(userId);
    }

    params.push(userId);
    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = $${params.length}`,
      params
    );
    return this.getById(userId);
  }

  static async getFavoritesByUserId(userId) {
    const result = await pool.query(
      `SELECT car_id, added_timestamp FROM favorite_cars_by_user WHERE user_id = $1`,
      [userId]
    );
    return result.rows;
  }

  static async addFavoriteCar(userId, carId) {
    await pool.query(
      `INSERT INTO favorite_cars_by_user (user_id, car_id, added_timestamp)
       VALUES ($1, $2, now()) ON CONFLICT (user_id, car_id) DO NOTHING`,
      [userId, carId]
    );
    return true;
  }

  static async removeFavoriteCar(userId, carId) {
    const result = await pool.query(
      `DELETE FROM favorite_cars_by_user WHERE user_id = $1 AND car_id = $2`,
      [userId, carId]
    );
    return (result.rowCount || 0) > 0;
  }

  static async getSearchHistory(userId, limit = 10) {
    const result = await pool.query(
      `SELECT search_timestamp, search_query, filters, result_count
       FROM user_searches WHERE user_id = $1
       ORDER BY search_timestamp DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  static async getRecommendations(userId, limit = 10) {
    const result = await pool.query(
      `SELECT car_id, similarity_score, recommendation_reason, method, rank
       FROM user_recommendations WHERE user_id = $1
       ORDER BY rank ASC NULLS LAST LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  static async removeFavorite(userId, carId) {
    return this.removeFavoriteCar(userId, carId);
  }
}

module.exports = User;
