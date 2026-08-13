const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { validate: isUUID } = require('uuid');

const CAR_COLUMNS = `
  id, source, listing_id, title, brand, model, year, price, fuel_type,
  transmission, mileage, door_count, fiscal_power, origin, first_owner,
  condition, sector, seller_city, creator, equipment, image_folder, url,
  publication_date
`;

function mapCar(row) {
  return {
    id: row.id,
    source: row.source,
    listing_id: row.listing_id,
    title: row.title,
    brand: row.brand,
    model: row.model,
    year: row.year,
    price: row.price != null ? Number(row.price) : null,
    fuel_type: row.fuel_type,
    transmission: row.transmission,
    mileage: row.mileage,
    door_count: row.door_count,
    seller_city: row.seller_city,
    sector: row.sector,
    publication_date: row.publication_date,
    condition: row.condition,
    creator: row.creator,
    equipment: row.equipment,
    first_owner: row.first_owner,
    fiscal_power: row.fiscal_power,
    image_folder: row.image_folder,
    image_url: row.image_folder ? `/images/cars/${row.image_folder}/image_1.jpg` : '/images/cars/default/image_1.jpg',
    origin: row.origin,
    url: row.url,
  };
}

class Car {
  static async search(filters = {}) {
    const conditions = [];
    const params = [];

    const add = (clause, value) => {
      params.push(value);
      conditions.push(clause.replace(/\$n/g, `$${params.length}`));
    };

    if (filters.searchTerm) {
      const like = `%${String(filters.searchTerm).toLowerCase()}%`;
      add(
        `(LOWER(brand) LIKE $n OR LOWER(model) LIKE $n OR LOWER(title) LIKE $n OR LOWER(fuel_type) LIKE $n OR LOWER(transmission) LIKE $n OR CAST(year AS TEXT) LIKE $n)`,
        like
      );
    }
    if (filters.brand) {
      if (Array.isArray(filters.brand)) {
        add(`LOWER(brand) = ANY($n)`, filters.brand.map((b) => String(b).toLowerCase()));
      } else {
        add(`LOWER(brand) = $n`, String(filters.brand).toLowerCase());
      }
    }
    if (filters.model) add(`LOWER(model) = $n`, String(filters.model).toLowerCase());
    if (filters.minPrice) add(`price >= $n`, parseInt(filters.minPrice));
    if (filters.maxPrice) add(`price <= $n`, parseInt(filters.maxPrice));
    if (filters.minYear) add(`year >= $n`, parseInt(filters.minYear));
    if (filters.maxYear) add(`year <= $n`, parseInt(filters.maxYear));
    if (filters.fuelType) {
      if (Array.isArray(filters.fuelType)) {
        add(`LOWER(fuel_type) = ANY($n)`, filters.fuelType.map((f) => String(f).toLowerCase()));
      } else {
        add(`LOWER(fuel_type) = $n`, String(filters.fuelType).toLowerCase());
      }
    }
    if (filters.transmission) {
      if (Array.isArray(filters.transmission)) {
        add(`LOWER(transmission) = ANY($n)`, filters.transmission.map((t) => String(t).toLowerCase()));
      } else {
        add(`LOWER(transmission) = $n`, String(filters.transmission).toLowerCase());
      }
    }
    if (filters.doorCount) {
      if (Array.isArray(filters.doorCount)) {
        add(`door_count = ANY($n)`, filters.doorCount.map((d) => parseInt(d)));
      } else {
        add(`door_count = $n`, parseInt(filters.doorCount));
      }
    }
    if (filters.mileageMin) add(`mileage >= $n`, parseInt(filters.mileageMin));
    if (filters.mileageMax) add(`mileage <= $n`, parseInt(filters.mileageMax));
    if (filters.sellerCity) add(`LOWER(seller_city) = $n`, String(filters.sellerCity).toLowerCase());
    if (filters.sector) add(`LOWER(sector) = $n`, String(filters.sector).toLowerCase());

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const offset = (page - 1) * limit;

    const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM cars ${where}`, params);
    const total = countRes.rows[0].total;

    const result = await pool.query(
      `SELECT ${CAR_COLUMNS} FROM cars ${where} ORDER BY price DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    return { cars: result.rows.map(mapCar), total };
  }

  static async getById(id) {
    if (!isUUID(id)) return null;
    const result = await pool.query(`SELECT ${CAR_COLUMNS} FROM cars WHERE id = $1`, [id]);
    return result.rows.length ? mapCar(result.rows[0]) : null;
  }

  static async getAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const totalRes = await pool.query(`SELECT COUNT(*)::int AS total FROM cars`);
    const total = totalRes.rows[0].total;
    const result = await pool.query(
      `SELECT ${CAR_COLUMNS} FROM cars ORDER BY publication_date DESC NULLS LAST LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return { cars: result.rows.map(mapCar), total };
  }

  static async getLatest(limit = 10) {
    const result = await pool.query(
      `SELECT ${CAR_COLUMNS} FROM cars WHERE publication_date IS NOT NULL AND publication_date != ''
       ORDER BY publication_date DESC LIMIT $1`,
      [limit]
    );
    return result.rows.map(mapCar);
  }

  static async getRecentlyViewed(userId, limit = 5) {
    const result = await pool.query(
      `SELECT c.${CAR_COLUMNS}
         FROM cars c
         JOIN (
           SELECT car_id, MAX(view_timestamp) AS last_view
             FROM car_views_by_user
            WHERE user_id = $1
            GROUP BY car_id
            ORDER BY last_view DESC
            LIMIT $2
         ) v ON v.car_id = c.id
        ORDER BY v.last_view DESC`,
      [userId, limit]
    );
    return result.rows.map(mapCar);
  }

  static async recordView(userId, carId, viewSource = 'detail_page') {
    if (!isUUID(userId) || !isUUID(carId)) return;
    await pool.query(
      `INSERT INTO car_views_by_user (user_id, view_date, view_timestamp, car_id, view_duration_seconds, view_source)
       VALUES ($1, CURRENT_DATE, now(), $2, 30, $3)`,
      [userId, carId, viewSource]
    );
  }

  static async getFavoritesByUserId(userId) {
    const result = await pool.query(
      `SELECT c.${CAR_COLUMNS}
         FROM favorite_cars_by_user f
         JOIN cars c ON c.id = f.car_id
        WHERE f.user_id = $1
        ORDER BY f.added_timestamp DESC`,
      [userId]
    );
    return result.rows.map(mapCar);
  }

  static async addFavorite(userId, carId) {
    if (!isUUID(userId) || !isUUID(carId)) throw new Error('Invalid ID format');
    await pool.query(
      `INSERT INTO favorite_cars_by_user (user_id, car_id, added_timestamp)
       VALUES ($1, $2, now()) ON CONFLICT (user_id, car_id) DO NOTHING`,
      [userId, carId]
    );
  }

  static async removeFavorite(userId, carId) {
    if (!isUUID(userId) || !isUUID(carId)) throw new Error('Invalid ID format');
    const result = await pool.query(
      `DELETE FROM favorite_cars_by_user WHERE user_id = $1 AND car_id = $2`,
      [userId, carId]
    );
    return (result.rowCount || 0) > 0;
  }

  static async create(carData) {
    const carId = carData.id || uuidv4();
    const result = await pool.query(
      `INSERT INTO cars (
         id, source, listing_id, title, brand, model, year, price, fuel_type,
         transmission, mileage, door_count, fiscal_power, origin, first_owner,
         condition, sector, seller_city, creator, equipment, image_folder, url,
         publication_date
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING ${CAR_COLUMNS}`,
      [
        carId,
        carData.source || 'user_submission',
        carData.listing_id || null,
        carData.title,
        carData.brand,
        carData.model,
        carData.year,
        carData.price,
        carData.fuel_type,
        carData.transmission,
        carData.mileage,
        carData.door_count,
        carData.fiscal_power,
        carData.origin || null,
        carData.first_owner || null,
        carData.condition || null,
        carData.sector,
        carData.seller_city,
        carData.creator || null,
        carData.equipment || '',
        carData.image_folder || '',
        carData.url || null,
        carData.publication_date || null,
      ]
    );
    return mapCar(result.rows[0]);
  }

  static async getBrandDistribution({ yearMin, yearMax, fuelType }) {
    const conditions = [];
    const params = [];
    if (fuelType && fuelType !== 'All') {
      params.push(String(fuelType).toLowerCase());
      conditions.push(`LOWER(fuel_type) = $${params.length}`);
    }
    if (yearMin && yearMax) {
      params.push(parseInt(yearMin), parseInt(yearMax));
      conditions.push(`year BETWEEN $${params.length - 1} AND $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT brand, COUNT(*)::int AS count FROM cars ${where} GROUP BY brand ORDER BY count DESC`,
      params
    );
    return result.rows;
  }

  static async getCarBubbles({ yearMin, yearMax, maxPrice, fuelType }) {
    const conditions = [];
    const params = [];
    if (fuelType && fuelType !== 'All') {
      params.push(String(fuelType).toLowerCase());
      conditions.push(`LOWER(fuel_type) = $${params.length}`);
    }
    if (yearMin && yearMax) {
      params.push(parseInt(yearMin), parseInt(yearMax));
      conditions.push(`year BETWEEN $${params.length - 1} AND $${params.length}`);
    }
    const priceCap = maxPrice ? parseInt(maxPrice) : 10000000;
    params.push(priceCap);
    conditions.push(`price > 0 AND price <= $${params.length}`);

    const result = await pool.query(
      `SELECT brand, price, year, fuel_type, COUNT(*) OVER (PARTITION BY brand) AS popularity
         FROM cars WHERE ${conditions.join(' AND ')}`,
      params
    );
    return result.rows.map((r) => ({
      brand: r.brand,
      price: r.price != null ? Number(r.price) : null,
      year: r.year,
      fuel_type: r.fuel_type,
      popularity: parseInt(r.popularity),
    }));
  }
}

module.exports = Car;
