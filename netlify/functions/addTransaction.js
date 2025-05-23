const connectToDatabase = require('./lib/mongoClient');
const Joi = require('joi');
const authenticate = require('./authMiddleware');
const { ObjectId } = require('mongodb');

const expenseSchema = Joi.object({
  amount: Joi.number().positive().required(),
  category: Joi.string().min(1).required(),
  note: Joi.string().allow('', null),
  date: Joi.date().optional(),
});

function getMonthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

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

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing request body' }),
      };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid JSON body' }),
      };
    }

    // Validate request body
    const { error, value } = expenseSchema.validate(body);
    if (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: error.details[0].message }),
      };
    }

    const { amount, category, note, date } = value;

    // Parse and validate date
    const expenseDate = date ? new Date(date) : new Date();
    if (isNaN(expenseDate.getTime())) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid date format' }),
      };
    }

    const db = await connectToDatabase();
    const expensesCollection = db.collection('expenses');
    const usersCollection = db.collection('users');

    // Fetch user data for salary and saving goal
    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { monthlySalary: 1, savingGoal: 1 } }
    );

    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    // Construct new expense record
    const expense = {
      userId: new ObjectId(userId),
      amount,
      category,
      note: note || '',
      date: expenseDate,
      salaryAtTime: user.monthlySalary || 0,
      savingGoalAtTime: user.savingGoal || 0,
      createdAt: new Date(),
    };

    // Insert the new expense
    await expensesCollection.insertOne(expense);

    // Calculate total spent for the month of the expense
    const { start, end } = getMonthRange(expenseDate);
    const monthlyExpenses = await expensesCollection.aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' },
        },
      },
    ]).toArray();

    const totalSpentThisMonth = monthlyExpenses[0]?.totalSpent || 0;
    const updatedBalance = (user.monthlySalary || 0) - totalSpentThisMonth;

    // Update user's balance in DB
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { balance: updatedBalance } }
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Expense added and balance updated successfully',
        updatedBalance,
      }),
    };
  } catch (error) {
    console.error('Error adding expense:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
