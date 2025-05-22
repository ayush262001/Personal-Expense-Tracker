const connectToDatabase = require('./lib/mongoClient');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Missing or malformed token' }),
      };
    }

    const token = authHeader.slice(7).trim(); // remove 'Bearer ' prefix

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error('JWT verification failed:', err.message);
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid token' }),
      };
    }

    const userId = decoded.userId;
    const db = await connectToDatabase();

    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { totalSavings: 1 } }
    );

    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        totalSavings: user.totalSavings || 0,
      }),
    };
  } catch (error) {
    console.error('Error fetching total savings:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
