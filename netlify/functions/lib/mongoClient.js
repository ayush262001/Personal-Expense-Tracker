const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
let client;
let clientPromise;

if (!uri) {
  throw new Error('Please define the MONGO_URI environment variable');
}

if (!clientPromise) {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

async function connectToDatabase() {
  await clientPromise;
  return client.db(); // returns default DB from URI
}

module.exports = connectToDatabase;
