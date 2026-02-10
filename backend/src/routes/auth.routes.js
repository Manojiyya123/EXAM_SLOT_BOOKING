const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');

/**
 * POST /api/auth/student/login
 * Initiate student login with OTP
 */
router.post('/student/login', async (req, res, next) => {
    try {
        const { rollNo, email } = req.body;

        if (!rollNo || !email) {
            return res.status(400).json({ message: 'rollNo and email are required' });
        }

        const result = await authService.initiateStudentLogin(rollNo, email);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/student/verify
 * Verify OTP and return JWT token
 */
router.post('/student/verify', async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'email and otp are required' });
        }

        const result = await authService.verifyStudentOtp(email, otp);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/auth/admin/login
 * Admin login with password
 */
router.post('/admin/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'email and password are required' });
        }

        const result = await authService.adminLogin(email, password);
        res.json(result);
    } catch (error) {
        // Return 401 for auth errors instead of 500
        res.status(401).json({ message: error.message });
    }
});

module.exports = router;
