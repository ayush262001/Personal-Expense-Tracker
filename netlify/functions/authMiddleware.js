const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

function authenticate(event) {
  const authHeader = event.headers?.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { error: 'Authorization token required', statusCode: 401 };
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return { error: 'Authorization token required', statusCode: 401 };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { user: { userId: decoded.userId, email: decoded.email } };
  } catch (err) {
    return { error: 'Invalid or expired token', statusCode: 401 };
  }
}

module.exports = authenticate;
