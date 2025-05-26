const connectToDatabase = require('./lib/mongoClient');
const authenticate = require('./authMiddleware');
const { ObjectId } = require('mongodb');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
      body: '',
    };
  }

  try {
    const auth = await authenticate(event);
    if (auth.error) {
      return {
        statusCode: auth.statusCode || 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: auth.error }),
      };
    }

    const userId = auth.user.userId;
    const db = await connectToDatabase();

    // Fetch user salary
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { salary: 1 } }
    );

    if (!user || typeof user.salary !== 'number') {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'User salary not found' }),
      };
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch this month's expenses
    const expenses = await db.collection('expenses').aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]).toArray();

    const totalExpenses = expenses.length > 0 ? expenses[0].total : 0;
    const balance = user.salary - totalExpenses;

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
      body: JSON.stringify({ balance }),
    };
  } catch (error) {
    console.error('Error calculating balance:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
