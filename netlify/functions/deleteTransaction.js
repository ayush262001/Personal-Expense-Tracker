const connectToDatabase = require('./lib/mongoClient');
const authenticate = require('./authMiddleware');
const { ObjectId } = require('mongodb');

exports.handler = async (event) => {
  try {
    // Authenticate user
    const auth = await authenticate(event);
    if (auth.error) {
      return {
        statusCode: auth.statusCode || 401,
        body: JSON.stringify({ message: auth.error }),
      };
    }
    const userId = auth.user.userId;

    // Get expenseId from query or request body (depending on your method)
    const expenseId = event.queryStringParameters?.expenseId;
    if (!expenseId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing expenseId parameter' }),
      };
    }

    if (!ObjectId.isValid(expenseId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid expenseId' }),
      };
    }

    const db = await connectToDatabase();

    // Delete the expense only if it belongs to the authenticated user
    const result = await db.collection('expenses').deleteOne({
      _id: new ObjectId(expenseId),
      userId: new ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Expense not found or unauthorized' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Expense deleted successfully' }),
    };
  } catch (error) {
    console.error('Error deleting expense:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
