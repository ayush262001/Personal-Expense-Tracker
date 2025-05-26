const connectToDatabase = require('./lib/mongoClient');
const authenticate = require('./authMiddleware');
const { ObjectId } = require('mongodb');

exports.handler = async (event) => {
  // Handle CORS preflight
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

    const params = event.queryStringParameters || {};
    const filterRaw = params.filter || '0';
    const filter = parseInt(filterRaw, 10);

    if (![0, 1, 2, 3].includes(filter)) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'Invalid filter value' }),
      };
    }

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
    }

    if(filter===3){
      const transactions = await db
      .collection('transactions')
      .find({
        userId: new ObjectId(userId),
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
    }

    else{
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
    }

    
  } catch (error) {
    console.error('Error fetching transactions by timeframe:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
