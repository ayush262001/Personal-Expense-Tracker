const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  if (!client.isConnected || !client.isConnected()) {
    await client.connect();
  }
  cachedDb = client.db(); // default DB from connection string
  return cachedDb;
}

module.exports = connectToDatabase;
