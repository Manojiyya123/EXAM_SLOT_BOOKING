const { verifyToken } = require('../config/jwt');

/**
 * JWT Authentication Middleware
 * Verifies the JWT token and attaches user info to request
 */
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        // Attach user info to request
        req.user = {
            subject: decoded.sub,
            role: decoded.role
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(401).json({ message: 'Invalid token' });
    }
};

/**
 * Role-based Authorization Middleware
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        next();
    };
};

/**
 * Convenience middleware for admin-only routes
 */
const adminOnly = [authenticate, authorize('ADMIN')];

/**
 * Convenience middleware for student-only routes
 */
const studentOnly = [authenticate, authorize('STUDENT')];

module.exports = {
    authenticate,
    authorize,
    adminOnly,
    studentOnly
};
