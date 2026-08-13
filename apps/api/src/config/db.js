const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.PG_PORT || '5432', 10),
  database: process.env.PGDATABASE || process.env.PG_DATABASE || 'nextride',
  user: process.env.PGUSER || process.env.PG_USER || 'nextride',
  password: process.env.PGPASSWORD || process.env.PG_PASSWORD || 'nextride',
});

if (process.env.NODE_ENV !== 'test') {
  pool
    .connect()
    .then((client) => {
      console.log(`Connected to PostgreSQL at ${pool.options.host}:${pool.options.port}/${pool.options.database}`);
      client.release();
    })
    .catch((err) => console.error('Error connecting to PostgreSQL:', err.message));
}

module.exports = pool;
