// Single source of truth for the JWT signing secret.
const JWT_SECRET = process.env.JWT_SECRET || 'surgecart-dev-secret';

module.exports = { JWT_SECRET };
