const cassandra = require('cassandra-driver');

const contactPoint = process.env.CASSANDRA_CONTACT_POINT || 'localhost';
const localDataCenter = process.env.CASSANDRA_LOCAL_DATACENTER || 'datacenter1';
const keyspace = process.env.CASSANDRA_KEYSPACE || 'cars_keyspace';

const client = new cassandra.Client({
  contactPoints: [contactPoint],
  localDataCenter,
  keyspace,
});

if (process.env.NODE_ENV !== 'test') {
  client
    .connect()
    .then(() => console.log(`Connected to Cassandra at ${contactPoint} (${keyspace})`))
    .catch((err) => console.error('Error connecting to Cassandra:', err.message));
}

module.exports = client;
