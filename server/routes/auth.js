const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const trackStore = require('../services/trackStore');

const JWT_SECRET = process.env.JWT_SECRET || 'surgecart-dev-secret';

const inMemoryUsers = new Map();

function mkId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function useMongo() {
  return !trackStore.isMemoryMode();
}

async function findUserByEmail(email) {
  if (useMongo()) {
    try {
      const user = await User.findOne({ email });
      if (user) return { source: 'mongo', user };
    } catch (err) {
      // fall through to in-memory store
    }
  }
  const found = [...inMemoryUsers.values()].find((u) => u.email === email);
  if (found) return { source: 'memory', user: found };
  return { source: null, user: null };
}

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    if (useMongo()) {
      try {
        const existing = await User.findOne({ email });
        if (existing) {
          return res.status(400).json({ error: 'Email already registered' });
        }
        const user = new User({ email, password: hashedPassword, name });
        await user.save();
        return res.status(201).json({
          message: 'User registered',
          user: { id: user._id, email: user.email, name: user.name },
        });
      } catch (err) {
        console.warn('[auth] Mongo unavailable, using in-memory user store:', err.message);
      }
    }

    if ([...inMemoryUsers.values()].some((u) => u.email === email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const id = mkId();
    const user = { _id: id, id, email, password: hashedPassword, name };
    inMemoryUsers.set(id, user);
    return res.status(201).json({
      message: 'User registered (in-memory)',
      user: { id, email, name },
    });
  } catch (err) {
    console.error('[auth] register failed:', err.stack || err.message || err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { user: found } = await findUserByEmail(email);
    if (!found) return res.status(400).json({ error: 'Invalid credentials' });

    const passwordMatches = await bcrypt.compare(password, found.password);
    if (!passwordMatches) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: found._id || found.id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({
      token,
      user: { id: found._id || found.id, email: found.email, name: found.name },
    });
  } catch (err) {
    console.error('[auth] login failed:', err.stack || err.message || err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
