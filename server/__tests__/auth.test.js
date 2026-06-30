const request = require('supertest');
const app = require('../index'); // Assuming your Express app is exported from index.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

describe('Authentication Routes', () => {
    beforeAll(async () => {
        await User.deleteMany({}); // Clear the user collection before tests
    });

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'test@example.com', password: 'password', name: 'Test User' });
        expect(res.statusCode).toEqual(201);
        expect(res.body.message).toBe('User registered successfully');
    });

    it('should login an existing user', async () => {
        const user = new User({
            email: 'test@example.com',
            password: await bcrypt.hash('password', 10),
            name: 'Test User'
        });
        await user.save();

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'password' });
        expect(res.statusCode).toEqual(200);
        expect(res.body.token).toBeDefined();
    });

    it('should fail to login with invalid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'wrong@example.com', password: 'wrongpassword' });
        expect(res.statusCode).toEqual(401);
        expect(res.body.error).toBe('Invalid email or password');
    });
});
