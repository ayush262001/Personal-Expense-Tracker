const connectToDatabase = require('./lib/mongoClient');

async function calculateMonthlySavings() {
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

    // Check if saving record already exists for this month & user
    const exists = await savingsCollection.findOne({
      userId,
      month: monthString,
    });
    if (exists) {
      continue; // Skip inserting duplicate
    }

    // Save monthly saving
    await savingsCollection.insertOne({
      userId,
      month: monthString,
      saving,
      createdAt: new Date(),
    });

    // Update total savings on user document
    await db.collection('users').updateOne(
      { _id: userId },
      { $inc: { totalSavings: saving } }
    );
  }
}

// Utility function
function getMonthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

module.exports = calculateMonthlySavings;
