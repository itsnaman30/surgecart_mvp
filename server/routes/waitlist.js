const express = require('express');
const router = express.Router();

const waitlistEntries = [];

router.post('/', (req, res) => {
  const { email } = req.body;
  if (!email?.trim() || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required.' });
  }

  const normalized = email.trim().toLowerCase();
  if (waitlistEntries.some((e) => e.email === normalized)) {
    return res.status(200).json({ status: 'already_registered', email: normalized });
  }

  const entry = { email: normalized, joinedAt: new Date().toISOString() };
  waitlistEntries.push(entry);
  console.log(`[waitlist] New signup: ${normalized} (total: ${waitlistEntries.length})`);

  res.status(201).json({ status: 'registered', email: normalized, position: waitlistEntries.length });
});

router.get('/count', (req, res) => {
  res.json({ count: waitlistEntries.length });
});

module.exports = router;
