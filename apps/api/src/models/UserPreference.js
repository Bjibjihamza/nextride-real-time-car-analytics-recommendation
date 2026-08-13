const pool = require('../config/db');

class UserPreference {
  static async getByUserId(userId) {
    const result = await pool.query(
      `SELECT user_id, preferred_brands, preferred_fuel_types, preferred_transmissions,
              budget_min, budget_max, mileage_min, mileage_max, preferred_years,
              preferred_door_count, last_updated
       FROM user_preferences WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  static async update(userId, preferences) {
    const result = await pool.query(
      `INSERT INTO user_preferences (
         user_id, preferred_brands, preferred_fuel_types, preferred_transmissions,
         budget_min, budget_max, mileage_min, mileage_max, preferred_years,
         preferred_door_count, last_updated
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
       ON CONFLICT (user_id) DO UPDATE SET
         preferred_brands = EXCLUDED.preferred_brands,
         preferred_fuel_types = EXCLUDED.preferred_fuel_types,
         preferred_transmissions = EXCLUDED.preferred_transmissions,
         budget_min = EXCLUDED.budget_min,
         budget_max = EXCLUDED.budget_max,
         mileage_min = EXCLUDED.mileage_min,
         mileage_max = EXCLUDED.mileage_max,
         preferred_years = EXCLUDED.preferred_years,
         preferred_door_count = EXCLUDED.preferred_door_count,
         last_updated = now()
       RETURNING user_id, preferred_brands, preferred_fuel_types, preferred_transmissions,
                 budget_min, budget_max, mileage_min, mileage_max, preferred_years,
                 preferred_door_count, last_updated`,
      [
        userId,
        preferences.preferred_brands || [],
        preferences.preferred_fuel_types || [],
        preferences.preferred_transmissions || [],
        preferences.budget_min ?? null,
        preferences.budget_max ?? null,
        preferences.mileage_min ?? null,
        preferences.mileage_max ?? null,
        preferences.preferred_years || [],
        preferences.preferred_door_count || [],
      ]
    );
    return result.rows[0];
  }
}

module.exports = UserPreference;
