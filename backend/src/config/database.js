const { Pool } = require('pg');

// Parse connection URL or use individual settings
const connectionConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: {
            rejectUnauthorized: false
        }
    };

const pool = new Pool({
    ...connectionConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err.message);
});

// Helper function to run queries
const query = async (text, params) => {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    } finally {
        client.release();
    }
};

// Transaction helper
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Test connection with better error handling
const testConnection = async () => {
    try {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT NOW()');
            console.log('Database time:', result.rows[0].now);
            return true;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Database connection test failed:', error.message);
        if (error.code === 'ENOTFOUND') {
            console.error('⚠️  DNS resolution failed. Check if DB_HOST is correct and your network has internet access.');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('⚠️  Connection refused. Check if the database server is running.');
        } else if (error.message.includes('password authentication failed')) {
            console.error('⚠️  Invalid database credentials.');
        }
        throw error;
    }
};

module.exports = {
    pool,
    query,
    transaction,
    testConnection
};
