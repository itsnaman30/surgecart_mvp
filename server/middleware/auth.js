const jwt = require('jsonwebtoken');

const DEV_FALLBACK_SECRET = 'surgecart-dev-secret';

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production. Refusing to start with an insecure default.'
    );
  }

  console.warn(
    '[auth] JWT_SECRET is not set; falling back to an insecure development secret. Set JWT_SECRET before deploying.'
  );
  return DEV_FALLBACK_SECRET;
}

const JWT_SECRET = resolveJwtSecret();

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireAuth, JWT_SECRET };
