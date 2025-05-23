const connectToDatabase = require('./lib/mongoClient');

function getMonthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

exports.handler = async (event) => {
  // CORS preflight handling
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  try {
    const db = await connectToDatabase();
    const users = await db.collection('users').find({}).toArray();
    const expensesCollection = db.collection('expenses');
    const savingsCollection = db.collection('savings');

    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const { start, end } = getMonthRange(lastMonth);
    const monthString = `${start.getFullYear()}-${(start.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;

    for (const user of users) {
      const userId = user._id;
      const monthlySalary = user.monthlySalary || 0;

      const monthlyExpenses = await expensesCollection
        .aggregate([
          {
            $match: {
              userId: userId,
              date: { $gte: start, $lt: end },
            },
          },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: '$amount' },
            },
          },
        ])
        .toArray();

      const totalSpent = monthlyExpenses[0]?.totalSpent || 0;
      const saving = monthlySalary - totalSpent;

      const exists = await savingsCollection.findOne({
        userId,
        month: monthString,
      });
      if (exists) continue;

      await savingsCollection.insertOne({
        userId,
        month: monthString,
        saving,
        createdAt: new Date(),
      });

      await db.collection('users').updateOne(
        { _id: userId },
        { $inc: { totalSavings: saving } }
      );
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Monthly savings calculated successfully' }),
    };
  } catch (err) {
    console.error('Savings error:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Failed to calculate savings' }),
    };
  }
};
