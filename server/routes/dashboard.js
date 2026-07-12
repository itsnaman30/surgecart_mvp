const router = require('express').Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// User Dashboard
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(200).json({
        id: userId,
        email: '',
        name: '',
      });
    }

    res.status(200).json({
      id: user._id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

module.exports = router;
