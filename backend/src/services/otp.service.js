/**
 * OTP Service - In-memory implementation
 * For production, use Redis for distributed caching
 */

// In-memory OTP storage
const otpStore = new Map();

// Rate limiting storage
const rateStore = new Map();

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOtp = () => {
    return String(Math.floor(100000 + Math.random() * 900000));
};

/**
 * Save OTP with TTL (5 minutes)
 * @param {string} key - The key (usually "otp:" + email)
 * @param {string} otp - The OTP to store
 * @param {number} ttlSeconds - Time to live in seconds (default: 300)
 */
const saveOtp = (key, otp, ttlSeconds = 300) => {
    const expiry = Date.now() + (ttlSeconds * 1000);
    otpStore.set(key, { otp, expiry });

    // Auto-cleanup after TTL
    setTimeout(() => {
        otpStore.delete(key);
    }, ttlSeconds * 1000);
};

/**
 * Get stored OTP
 * @param {string} key - The key to look up
 * @returns {string|null} The OTP or null if expired/not found
 */
const getOtp = (key) => {
    const data = otpStore.get(key);
    if (!data) return null;

    if (Date.now() > data.expiry) {
        otpStore.delete(key);
        return null;
    }

    return data.otp;
};

/**
 * Delete stored OTP
 * @param {string} key - The key to delete
 */
const deleteOtp = (key) => {
    otpStore.delete(key);
};

/**
 * Check rate limit
 * @param {string} key - The rate limit key
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowSeconds - Time window in seconds
 * @returns {boolean} True if within limit, false if exceeded
 */
const checkRateLimit = (key, maxAttempts = 5, windowSeconds = 300) => {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    let attempts = rateStore.get(key) || [];

    // Filter out old attempts
    attempts = attempts.filter(time => time > windowStart);

    if (attempts.length >= maxAttempts) {
        return false;
    }

    attempts.push(now);
    rateStore.set(key, attempts);

    // Cleanup old entries periodically
    setTimeout(() => {
        const current = rateStore.get(key) || [];
        const filtered = current.filter(time => time > Date.now() - (windowSeconds * 1000));
        if (filtered.length === 0) {
            rateStore.delete(key);
        } else {
            rateStore.set(key, filtered);
        }
    }, windowSeconds * 1000);

    return true;
};

module.exports = {
    generateOtp,
    saveOtp,
    getOtp,
    deleteOtp,
    checkRateLimit
};
