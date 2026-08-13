/**
 * Backend API tests.
 *
 * PostgreSQL (config/db) is mocked out and the ML service is mocked out
 * (axios), so these tests run anywhere without Docker.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const request = require('supertest');

const mockPool = {
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
};

jest.mock('../src/config/db', () => mockPool);
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({
    data: { prediction: { predictedPrice: 150000 } },
  }),
}));

const app = require('../src/app');

const validToken = jwt.sign({ userId: '3c31dfc1-4c66-43e9-8a7f-000000000001' }, process.env.JWT_SECRET);

const carRow = {
  id: '3c31dfc1-4c66-43e9-8a7f-000000000002',
  source: 'avito',
  listing_id: '123',
  title: 'Toyota Corolla',
  brand: 'toyota',
  model: 'corolla',
  year: 2018,
  price: 150000,
  fuel_type: 'diesel',
  transmission: 'manuelle',
  mileage: 90000,
  door_count: 5,
  sector: 'Casablanca',
  seller_city: 'Casablanca',
};

beforeEach(() => {
  mockPool.query.mockReset();
  mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('GET /', () => {
  it('returns a welcome message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/NextRide/i);
  });
});

describe('GET /api/cars', () => {
  it('returns a paginated car list', async () => {
    mockPool.query.mockImplementation((sql) => {
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ total: 1 }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [carRow], rowCount: 1 });
    });
    const res = await request(app).get('/api/cars?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.cars).toHaveLength(1);
    expect(res.body.cars[0].brand).toBe('toyota');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/auth/register', () => {
  it('registers a new user and returns a token', async () => {
    mockPool.query.mockImplementation((sql) => {
      if (sql.includes('FROM users WHERE email')) {
        return Promise.resolve({ rows: [], rowCount: 0 }); // no existing user
      }
      return Promise.resolve({
        rows: [{
          user_id: '3c31dfc1-4c66-43e9-8a7f-000000000001',
          username: 'hamza',
          email: 'hamza@example.com',
          age: 25,
          location: 'Casablanca',
        }],
        rowCount: 1,
      });
    });

    const res = await request(app).post('/api/auth/register').send({
      username: 'hamza',
      email: 'hamza@example.com',
      password: 'password123',
      age: 25,
      location: 'Casablanca',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('hamza@example.com');
  });
});

describe('POST /api/prediction', () => {
  it('predicts a price through the (mocked) ML service', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

    const res = await request(app).post('/api/prediction').send({
      userId: '3c31dfc1-4c66-43e9-8a7f-000000000001',
      brand: 'toyota',
      model: 'corolla',
      year: 2018,
      mileage: 90000,
      fuel_type: 'diesel',
      transmission: 'manuelle',
      fiscal_power: 6,
    });
    expect(res.status).toBe(200);
    expect(res.body.prediction.predictedPrice).toBe(150000);
  });

  it('rejects requests missing required fields', async () => {
    const res = await request(app).post('/api/prediction').send({ userId: 'x', brand: 'toyota' });
    expect(res.status).toBe(400);
  });
});

describe('Protected /api/users routes', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('returns the current user with a valid token', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{
        user_id: '3c31dfc1-4c66-43e9-8a7f-000000000001',
        username: 'hamza',
        email: 'hamza@example.com',
        age: 25,
        location: 'Casablanca',
      }],
      rowCount: 1,
    });

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('hamza');
  });
});
