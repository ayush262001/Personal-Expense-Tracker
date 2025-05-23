const connectToDatabase = require('./lib/mongoClient');
const authenticate = require('./authMiddleware');
const { ObjectId } = require('mongodb');

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
  // CORS preflight response
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
    const filter = event.queryStringParameters?.filter;
    if (!['0', '1', '2', '3'].includes(filter)) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'Invalid filter parameter' }),
      };
    }

    const auth = await authenticate(event);
    if (auth.error) {
      return {
        statusCode: auth.statusCode || 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: auth.error }),
      };
    }

    const userId = auth.user.userId;
    const { start, end } = getDateRange(filter);
    const db = await connectToDatabase();

    const expenses = await db
      .collection('expenses')
      .aggregate([
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
      ])
      .toArray();

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
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
