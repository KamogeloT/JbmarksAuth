module.exports = async function (context, req) {
    context.log('Hello World function executed!');
    
    context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: {
            message: "Hello from Azure Function!",
            version: "test-2026-01-29",
            received: {
                body: req.body,
                query: req.query
            }
        }
    };
};
