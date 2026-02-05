/**
 * Backend-for-Frontend (BFF) API Server
 * Handles Bitrix24 OAuth token exchange for JBmarks Android app
 */

// Load environment variables (optional - Azure App Service uses App Settings)
try {
    require('dotenv').config();
} catch (e) {
    // dotenv not available - using environment variables from Azure App Settings
}

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const appInsights = require('applicationinsights');

// Middleware
const requestLogger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const apiKeyAuth = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');

// Initialize Application Insights if connection string is provided
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true, false)
        .setUseDiskRetryCaching(true)
        .start();
    console.log('Application Insights initialized');
}

const app = express();
const PORT = process.env.PORT || 8080;

// Trust proxy (important for Azure App Service)
app.set('trust proxy', 1);

// CORS configuration
const corsOptions = {
    origin: '*', // In production, restrict to Android app origins if possible
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: false
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'jbmarks-bff-api',
        version: '1.0.0'
    });
});

// API routes (with optional API key authentication)
app.use('/api/auth', apiKeyAuth, authRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'NotFound',
        message: `Route ${req.method} ${req.url} not found`
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`JBmarks BFF API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

module.exports = app;
