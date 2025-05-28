const connectToDatabase = require('./lib/mongoClient');

function getPreviousMonthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

exports.handler = async (event) => {
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
    const savingsCollection = db.collection('savings');

    const now = new Date();
    const { start, end } = getPreviousMonthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const monthString = `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}`;

    for (const user of users) {
      const { _id: userId, currentBalance = 0, savingsGoal = 0, totalSavings = 0, savingsHistory = [] } = user;

      // Skip if savings already logged for this month
      const alreadySaved = await savingsCollection.findOne({ userId, month: monthString });
      if (alreadySaved) continue;

      let savingsToAdd = 0;

      if (currentBalance >= savingsGoal) {
        savingsToAdd = currentBalance;
      } else {
        savingsToAdd = currentBalance; // could be less or negative
      }

      // Update savingsHistory array and totalSavings
      const savingsEntry = {
        month: monthString,
        goal: savingsGoal,
        saved: savingsToAdd,
        timestamp: new Date(),
      };

      await db.collection('users').updateOne(
        { _id: userId },
        {
          $inc: { totalSavings: savingsToAdd },
          $push: { savingsHistory: savingsEntry },
        }
      );

      await savingsCollection.insertOne({
        userId,
        month: monthString,
        goal: savingsGoal,
        saved: savingsToAdd,
        createdAt: new Date(),
      });
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Monthly savings evaluated and recorded.' }),
    };
  } catch (err) {
    console.error('Monthly savings update error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to process monthly savings update' }),
    };
  }
};
