const connectToDatabase = require('./lib/mongoClient');
const authenticate = require('./authMiddleware');
const { ObjectId } = require('mongodb');

exports.handler = async (event) => {
  // ✅ CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
      body: '',
    };
  }

  try {
    // ✅ Authenticate user
    const auth = await authenticate(event);
    if (auth.error) {
      return {
        statusCode: auth.statusCode || 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        },
        body: JSON.stringify({ message: auth.error }),
      };
    }

    const expenseId = event.queryStringParameters?.expenseId;
    if (!expenseId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        },
        body: JSON.stringify({ message: 'Missing expenseId parameter' }),
      };
    }

    if (!ObjectId.isValid(expenseId)) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        },
        body: JSON.stringify({ message: 'Invalid expenseId' }),
      };
    }

    const db = await connectToDatabase();
    const expenses = db.collection('expenses');

    // ✅ Delete expense by _id only
    const result = await expenses.deleteOne({ _id: new ObjectId(expenseId) });

    if (result.deletedCount === 0) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        },
        body: JSON.stringify({ message: 'Expense not found' }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      },
      body: JSON.stringify({ message: 'Expense deleted successfully' }),
    };
  } catch (error) {
    console.error('Error deleting expense:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
