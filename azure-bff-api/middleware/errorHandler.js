/**
 * Error handling middleware for Express
 */

function errorHandler(err, req, res, next) {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Don't leak stack traces in production
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // Determine status code
    const statusCode = err.statusCode || err.status || 500;

    // Build error response
    const errorResponse = {
        error: err.name || 'InternalServerError',
        message: err.message || 'An unexpected error occurred',
        ...(isDevelopment && { stack: err.stack })
    };

    // Add additional context for specific error types
    if (err.code) {
        errorResponse.code = err.code;
    }

    res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler;
