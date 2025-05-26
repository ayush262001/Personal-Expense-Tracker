const connectToDatabase = require('./lib/mongoClient');
const authenticate = require('./authMiddleware');
const Joi = require('joi');
const { ObjectId } = require('mongodb');

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

const categorySchema = Joi.object({
  name: Joi.string().min(1).required()
});

exports.handler = async (event) => {
  // ✅ CORS Preflight Handling
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: auth.error }),
      };
    }

    const userId = auth.user.userId;

    // ✅ Parse JSON body
    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'Invalid JSON body' }),
      };
    }

    // ✅ Validate input
    const { error, value } = categorySchema.validate(body);
    if (error) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: error.details[0].message }),
      };
    }

    const newCategory = value.name.trim();
    const db = await connectToDatabase();
    const users = db.collection('users');

    // ✅ Check if user exists
    const user = await users.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    const existingCategories = user.categories || [];

    // ✅ Fill missing default categories
    const missingDefaults = DEFAULT_CATEGORIES.filter(
      (cat) => !existingCategories.includes(cat)
    );

    if (missingDefaults.length > 0) {
      await users.updateOne(
        { _id: new ObjectId(userId) },
        { $addToSet: { categories: { $each: missingDefaults } } }
      );
    }

    // ✅ Combine categories for duplication check
    const finalCategories = [...new Set([...existingCategories, ...missingDefaults])];

    // ✅ Prevent duplicate addition
    if (finalCategories.includes(newCategory)) {
      return {
        statusCode: 409,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'Category already exists' }),
      };
    }

    // ✅ Add new category
    await users.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { categories: newCategory } }
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({ message: 'Category added successfully' }),
    };
  } catch (error) {
    console.error('Error adding category:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
