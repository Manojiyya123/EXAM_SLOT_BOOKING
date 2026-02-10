require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const studentRoutes = require('./routes/student.routes');
const slotRoutes = require('./routes/slot.routes');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin/slots', slotRoutes);

// Health check
app.get('/health', async (req, res) => {
    try {
        await testConnection();
        res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
    } catch (error) {
        res.json({ status: 'degraded', database: 'disconnected', error: error.message, timestamp: new Date().toISOString() });
    }
});

// Error handler
app.use(errorHandler);

// Start server
async function startServer() {
    // Test database connection (non-blocking)
    try {
        await testConnection();
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('⚠️  Database connection failed:', error.message);
        console.log('🔄 Server will start anyway. Database calls will fail until connection is restored.');
    }

    const server = app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📋 Health check: http://localhost:${PORT}/health`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️  Port ${PORT} is in use, trying port ${parseInt(PORT) + 1}...`);
            app.listen(parseInt(PORT) + 1, () => {
                console.log(`🚀 Server running on http://localhost:${parseInt(PORT) + 1}`);
                console.log(`📋 Health check: http://localhost:${parseInt(PORT) + 1}/health`);
            });
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
    });
}

startServer();

module.exports = app;
