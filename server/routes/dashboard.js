const router = require('express').Router();
const User = require('../models/User');

// User Dashboard
router.get('/', async (req, res) => {
    try {
        const userId = req.userId; // Assuming user ID is stored in req.user
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.status(200).json({
            email: user.email,
            name: user.name,
            // Add more user-specific data as needed
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

module.exports = router;
