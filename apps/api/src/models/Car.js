const client = require('../config/db');
const { types } = require('cassandra-driver');
const { v4: uuidv4 } = require('uuid');
const { validate: isUUID } = require('uuid');

class Car {
  static async search(filters, retryCount = 3) {
    try {
      // Fetch all rows (up to a limit) since Cassandra doesn't support LIKE without SASI indexes
      let query = 'SELECT * FROM cars_keyspace.cleaned_cars LIMIT 1000';
      const params = [];
      const conditions = [];

      // Handle other filters that Cassandra can process natively
      if (filters.brand) {
        if (Array.isArray(filters.brand)) {
          conditions.push(`brand IN (${filters.brand.map(() => '?').join(',')})`);
          params.push(...filters.brand);
        } else {
          conditions.push('brand = ?');
          params.push(filters.brand);
        }
      }
      if (filters.model) {
        conditions.push('model = ?');
        params.push(filters.model);
      }
      if (filters.minPrice) {
        conditions.push('price >= ?');
        params.push(parseInt(filters.minPrice));
      }
      if (filters.maxPrice) {
        conditions.push('price <= ?');
        params.push(parseInt(filters.maxPrice));
      }
      if (filters.minYear) {
        conditions.push('year >= ?');
        params.push(parseInt(filters.minYear));
      }
      if (filters.maxYear) {
        conditions.push('year <= ?');
        params.push(parseInt(filters.maxYear));
      }
      if (filters.fuelType) {
        if (Array.isArray(filters.fuelType)) {
          conditions.push(`fuel_type IN (${filters.fuelType.map(() => '?').join(',')})`);
          params.push(...filters.fuelType);
        } else {
          conditions.push('fuel_type = ?');
          params.push(filters.fuelType);
        }
      }
      if (filters.transmission) {
        if (Array.isArray(filters.transmission)) {
          conditions.push(`transmission IN (${filters.transmission.map(() => '?').join(',')})`);
          params.push(...filters.transmission);
        } else {
          conditions.push('transmission = ?');
          params.push(filters.transmission);
        }
      }
      if (filters.doorCount) {
        if (Array.isArray(filters.doorCount)) {
          conditions.push(`door_count IN (${filters.doorCount.map(() => '?').join(',')})`);
          params.push(...filters.doorCount);
        } else {
          conditions.push('door_count = ?');
          params.push(parseInt(filters.doorCount));
        }
      }
      if (filters.mileageMin) {
        conditions.push('mileage >= ?');
        params.push(parseInt(filters.mileageMin));
      }
      if (filters.mileageMax) {
        conditions.push('mileage <= ?');
        params.push(parseInt(filters.mileageMax));
      }
      if (filters.sellerCity) {
        conditions.push('seller_city = ?');
        params.push(filters.sellerCity);
      }
      if (filters.sector) {
        conditions.push('sector = ?');
        params.push(filters.sector);
      }

      if (conditions.length > 0) {
        query = 'SELECT * FROM cars_keyspace.cleaned_cars WHERE ' + conditions.join(' AND ') + ' ALLOW FILTERING';
      }

      console.log('Executing search query:', query, 'with params:', params);
      const result = await client.execute(query, params, { prepare: true });
      let cars = result.rows.map(car => ({
        id: car.id.toString(),
        brand: car.brand,
        model: car.model,
        title: car.title,
        price: car.price,
        fuel_type: car.fuel_type,
        transmission: car.transmission,
        year: car.year,
        door_count: car.door_count,
        seller_city: car.seller_city,
        sector: car.sector,
        publication_date: car.publication_date,
        condition: car.condition,
        creator: car.creator,
        equipment: car.equipment,
        first_owner: car.first_owner,
        fiscal_power: car.fiscal_power,
        image_folder: car.image_folder,
        mileage: car.mileage,
        origin: car.origin,
        source: car.source
      }));

      console.log('Fetched', cars.length, 'cars before searchTerm filter');

      // Log the fields we're searching on for each car to debug
      console.log('Cars data for searchTerm:', filters.searchTerm);
      cars.forEach(car => {
        console.log(`Car ID: ${car.id}, brand: ${car.brand}, model: ${car.model}, title: ${car.title}, fuel_type: ${car.fuel_type}, transmission: ${car.transmission}, year: ${car.year}`);
      });

      // Apply searchTerm filter in memory
      if (filters.searchTerm) {
        const searchPattern = filters.searchTerm.toLowerCase();
        cars = cars.filter(car => {
          return (
            (car.brand && car.brand.toLowerCase().includes(searchPattern)) ||
            (car.model && car.model.toLowerCase().includes(searchPattern)) ||
            (car.title && car.title.toLowerCase().includes(searchPattern)) ||
            (car.fuel_type && car.fuel_type.toLowerCase().includes(searchPattern)) ||
            (car.transmission && car.transmission.toLowerCase().includes(searchPattern)) ||
            (car.year && car.year.toString().includes(searchPattern))
          );
        });
      }

      console.log('Search returned', cars.length, 'cars after searchTerm filter');
      return cars;
    } catch (error) {
      console.error('Error in Car.search:', error);
      if (retryCount > 0) {
        console.warn(`Retrying search query, attempts left: ${retryCount}`);
        return this.search(filters, retryCount - 1);
      }
      return [];
    }
  }

  static async getById(id) {
    if (!isUUID(id)) {
      console.error('Invalid car id format in Car.getById:', id);
      return null;
    }
    try {
      const query = 'SELECT * FROM cars_keyspace.cleaned_cars WHERE id = ?';
      const result = await client.execute(query, [id], { prepare: true });
      if (result.rows.length === 0) {
        console.log('No car found for id:', id);
        return null;
      }
      const car = result.rows[0];
      return {
        id: car.id.toString(),
        brand: car.brand,
        model: car.model,
        title: car.title,
        price: car.price,
        fuel_type: car.fuel_type,
        transmission: car.transmission,
        year: car.year,
        door_count: car.door_count,
        seller_city: car.seller_city,
        sector: car.sector,
        publication_date: car.publication_date,
        condition: car.condition,
        creator: car.creator,
        equipment: car.equipment,
        first_owner: car.first_owner,
        fiscal_power: car.fiscal_power,
        image_folder: car.image_folder,
        image_url: car.image_folder ? `/images/cars/${car.image_folder}/image_1.jpg` : '/images/cars/default/image_1.jpg',
        mileage: car.mileage,
        origin: car.origin,
        source: car.source,
      };
    } catch (error) {
      console.error('Error in Car.getById:', error);
      return null;
    }
  }

  static async getAll(page, limit) {
    const offset = (page - 1) * limit;
    const query = 'SELECT * FROM cars_keyspace.cleaned_cars LIMIT 1000';
    const result = await client.execute(query, [], { prepare: true });
    const total = result.rows.length;
    const cars = result.rows
      .slice(offset, offset + limit)
      .map((car) => ({
        id: car.id.toString(),
        brand: car.brand,
        model: car.model,
        title: car.title,
        price: car.price,
        fuel_type: car.fuel_type,
        transmission: car.transmission,
        year: car.year,
        door_count: car.door_count,
        seller_city: car.seller_city,
        sector: car.sector,
        publication_date: car.publication_date,
        condition: car.condition,
        creator: car.creator,
        equipment: car.equipment,
        first_owner: car.first_owner,
        fiscal_power: car.fiscal_power,
        image_folder: car.image_folder,
        image_url: car.image_folder ? `/images/cars/${car.image_folder}/image_1.jpg` : '/images/cars/default/image_1.jpg',
        mileage: car.mileage,
        origin: car.origin,
        source: car.source,
      }));
    return { cars, total };
  }

  static async getLatest(limit) {
    console.log('Fetching latest cars with limit:', limit);
    const query = 'SELECT * FROM cars_keyspace.cleaned_cars LIMIT 1000';
    const result = await client.execute(query, [], { prepare: true });
    console.log('Fetched rows:', result.rows.length);

    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const [datePart, timePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('/').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      return new Date(year, month - 1, day, hours, minutes);
    };

    return result.rows
      .filter(car => car.publication_date)
      .sort((a, b) => {
        const dateA = parseDate(a.publication_date);
        const dateB = parseDate(b.publication_date);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB - dateA;
      })
      .slice(0, limit)
      .map(car => ({
        id: car.id.toString(),
        brand: car.brand,
        model: car.model,
        title: car.title,
        price: car.price,
        fuel_type: car.fuel_type,
        transmission: car.transmission,
        year: car.year,
        door_count: car.door_count,
        seller_city: car.seller_city,
        sector: car.sector,
        publication_date: car.publication_date,
        condition: car.condition,
        creator: car.creator,
        equipment: car.equipment,
        first_owner: car.first_owner,
        fiscal_power: car.fiscal_power,
        image_folder: car.image_folder,
        mileage: car.mileage,
        origin: car.origin,
        source: car.source,
      }));
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

  static async addFavorite(userId, carId) {
    try {
      const userUuid = types.Uuid.fromString(userId);
      const carUuid = types.Uuid.fromString(carId);
      const query = 'INSERT INTO cars_keyspace.favorite_cars_by_user (user_id, added_date, added_timestamp, car_id) VALUES (?, ?, ?, ?)';
      const addedDate = new Date().toISOString().split('T')[0];
      const timestamp = new Date();
      await client.execute(query, [userUuid, addedDate, timestamp, carUuid], { prepare: true });
    } catch (error) {
      console.error('Error in addFavorite:', error.message, 'carId:', carId);
      throw new Error('Invalid ID format');
    }
  }

  static async removeFavorite(userId, carId) {
    try {
      const userUuid = types.Uuid.fromString(userId);
      const carUuid = types.Uuid.fromString(carId);

      // Step 1: Find the favorite entry with the given user_id and car_id
      const findQuery = `
        SELECT added_timestamp
        FROM cars_keyspace.favorite_cars_by_user
        WHERE user_id = ? AND car_id = ? ALLOW FILTERING
      `;
      const findResult = await client.execute(findQuery, [userUuid, carUuid], { prepare: true });

      if (findResult.rows.length === 0) {
        console.log(`No favorite found for userId: ${userId}, carId: ${carId}`);
        return false;
      }

      // Step 2: Delete using the primary key (user_id, added_timestamp)
      const { added_timestamp } = findResult.rows[0];
      const deleteQuery = `
        DELETE FROM cars_keyspace.favorite_cars_by_user
        WHERE user_id = ? AND added_timestamp = ?
      `;
      await client.execute(deleteQuery, [userUuid, added_timestamp], { prepare: true });

      console.log(`Removed favorite for userId: ${userId}, carId: ${carId}`);
      return true;
    } catch (error) {
      console.error('Error in removeFavorite:', error.message, 'userId:', userId, 'carId:', carId);
      throw error;
    }
  }
}

module.exports = Car;