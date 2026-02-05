/**
 * Request logging middleware
 */

function requestLogger(req, res, next) {
    const startTime = Date.now();

    // Log request
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(
            `${new Date().toISOString()} - ${req.method} ${req.url} - ` +
            `${res.statusCode} - ${duration}ms`
        );
    });

    next();
}

module.exports = requestLogger;
