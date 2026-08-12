const client = require('../config/db');

class UserPreference {

  
  static async getByUserId(userId) {
    const query = 'SELECT * FROM user_preferences WHERE user_id = ?';
    const result = await client.execute(query, [userId], { prepare: true });
    return result.first();
  }

  static async update(userId, preferences) {
    const query = `
      INSERT INTO user_preferences (
        user_id, preferred_brands, preferred_fuel_types, preferred_transmissions,
        budget_min, budget_max, mileage_min, mileage_max, preferred_years, preferred_door_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userId,
      preferences.preferred_brands || [],
      preferences.preferred_fuel_types || [],
      preferences.preferred_transmissions || [],
      preferences.budget_min ?? null, // Use null-coalescing to handle undefined
      preferences.budget_max ?? null,
      preferences.mileage_min ?? null,
      preferences.mileage_max ?? null,
      preferences.preferred_years || [],
      preferences.preferred_door_count || []
    ];
    await client.execute(query, params, { prepare: true });
    return preferences;
  }
  

  static async update(userId, preferences) {
    const query = `
      INSERT INTO user_preferences (
        user_id, preferred_brands, preferred_fuel_types, preferred_transmissions,
        budget_min, budget_max, mileage_min, mileage_max, preferred_years, preferred_door_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userId,
      preferences.preferred_brands || [],
      preferences.preferred_fuel_types || [],
      preferences.preferred_transmissions || [],
      preferences.budget_min,
      preferences.budget_max,
      preferences.mileage_min,
      preferences.mileage_max,
      preferences.preferred_years || [],
      preferences.preferred_door_count || []
    ];
    await client.execute(query, params, { prepare: true });
    return preferences;
  }
}

module.exports = UserPreference;