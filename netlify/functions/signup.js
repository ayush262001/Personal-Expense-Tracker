const bcrypt = require('bcryptjs');
const connectToDatabase = require('./lib/mongoClient');
const Joi = require('joi');

const DEFAULT_CATEGORIES = [
  "Food",
  "Shopping",
  "Home Appliances",
  "Vehicles",
  "Dining",
  "Clubbing",
  "Cosmetics",
  "General",
  "Medical"
];

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(50).required(),
});

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { error, value } = signupSchema.validate(body);
    if (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: error.details[0].message }),
      };
    }

    const { email, password, name } = value;
    const db = await connectToDatabase();

    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: 'User already exists with this email' }),
      };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = {
      email,
      name,
      passwordHash,
      dateRegistered: new Date(),
      balance: 0,
      totalSavings: 0,           // fixed key name
      categories: DEFAULT_CATEGORIES,
    };

    await db.collection('users').insertOne(newUser);

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'User created successfully' }),
    };
  } catch (error) {
    console.error('Signup error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
