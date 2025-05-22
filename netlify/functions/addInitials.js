const connectToDatabase = require('./lib/mongoClient');
const Joi = require('joi');
const authenticate = require('./authMiddleware'); // make sure it supports async if needed
const { ObjectId } = require('mongodb');

const salarySchema = Joi.object({
  monthlySalary: Joi.number().min(0).required(),
  savingGoal: Joi.number().min(0).required(),
});

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

    const { error, value } = salarySchema.validate(body);
    if (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: error.details[0].message }),
      };
    }

    const { monthlySalary, savingGoal } = value;
    const db = await connectToDatabase();

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          monthlySalary,
          savingGoal,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    // Optional: fetch updated fields to return
    const updatedUser = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { monthlySalary: 1, savingGoal: 1 } }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Monthly salary and saving goal updated successfully',
        monthlySalary: updatedUser.monthlySalary,
        savingGoal: updatedUser.savingGoal,
      }),
    };
  } catch (error) {
    console.error('Error updating salary/saving:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
