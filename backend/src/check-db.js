require('dotenv').config();
const { testConnection, pool } = require('./config/database');

(async () => {
    try {
        console.log('Testing connection with:');
        console.log('DB_HOST:', process.env.DB_HOST);
        console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
        await testConnection();
        console.log('Connection successful!');
    } catch (err) {
        console.error('Connection failed:', err);
    } finally {
        await pool.end();
    }
})();
