const connectToDatabase = require('./lib/mongoClient');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

function getDateRange(filter) {
  const now = new Date();
  let start, end;

  switch (filter) {
    case '0': // This month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;

    case '1': // Last 6 months
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;

    case '2': // This year
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
      break;

    case '3': // Overall
      start = new Date(0);
      end = new Date(now.getFullYear() + 10, 0, 1);
      break;

    default:
      throw new Error('Invalid filter value');
  }

  return { start, end };
}

exports.handler = async (event) => {
  try {
    const filter = event.queryStringParameters?.filter;
    if (!['0', '1', '2', '3'].includes(filter)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid filter parameter' }),
      };
    }

    const authHeader = event.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Missing or malformed token' }),
      };
    }

    const token = authHeader.slice(7).trim();

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid token' }),
      };
    }

    const userId = decoded.userId;
    const { start, end } = getDateRange(filter);

    const db = await connectToDatabase();

    const expenses = await db.collection('expenses').aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: '$category',
          totalSpent: { $sum: '$amount' },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalSpent: 1,
        },
      },
    ]).toArray();

    const result = {};
    expenses.forEach(({ category, totalSpent }) => {
      result[category] = totalSpent;
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
      body: JSON.stringify({ spendingByCategory: result }),
    };
  } catch (error) {
    console.error('Error fetching spending by filter:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
