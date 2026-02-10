const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'verysecretkeythatshouldbechangedinproduction1234567890';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

/**
 * Generate a JWT token
 * @param {string} subject - The subject (rollNo for student, email for admin)
 * @param {string} role - The role (STUDENT or ADMIN)
 * @returns {string} JWT token
 */
const generateToken = (subject, role) => {
    return jwt.sign(
        {
            sub: subject,
            role: role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
    );
};

/**
 * Verify a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {object} Decoded token payload
 */
const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

/**
 * Decode a token without verification (for debugging)
 * @param {string} token - The JWT token to decode
 * @returns {object} Decoded token payload
 */
const decodeToken = (token) => {
    return jwt.decode(token);
};

module.exports = {
    generateToken,
    verifyToken,
    decodeToken,
    JWT_SECRET
};
