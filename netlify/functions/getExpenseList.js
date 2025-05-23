const connectToDatabase = require('./lib/mongoClient');
const authenticate = require('./authMiddleware');
const { ObjectId } = require('mongodb');

exports.handler = async (event) => {
  try {
    const auth = await authenticate(event);
    if (auth.error) {
      return {
        statusCode: auth.statusCode || 401,
        body: JSON.stringify({ message: auth.error }),
      };
    }

    const userId = auth.user.userId;
    const db = await connectToDatabase();

    // Parse filter from query string
    const params = event.queryStringParameters || {};
    const filter = parseInt(params.filter || '0', 10); // default to 0

    // Determine date range
    const now = new Date();
    let startDate;

    if (filter === 0) {
      // This month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filter === 1) {
      // Last 30 days
      startDate = new Date();
      startDate.setDate(now.getDate() - 30);
    } else if (filter === 2) {
      // Last 90 days
      startDate = new Date();
      startDate.setDate(now.getDate() - 90);
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid filter value' }),
      };
    }

    const transactions = await db
      .collection('transactions')
      .find({
        userId: new ObjectId(userId),
        createdAt: { $gte: startDate },
      })
      .sort({ createdAt: -1 })
      .toArray();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
      body: JSON.stringify({ transactions }),
    };
  } catch (error) {
    console.error('Error fetching transactions by timeframe:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
