FROM node:20-alpine

WORKDIR /app

# Copy only package files (not the .NET rmrs subproject)
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy only the Node.js app and config files
COPY server-simple.js ./
COPY railway.json ./

# Expose the port (Railway injects PORT env var)
EXPOSE 8080

# Start the server
CMD ["node", "server-simple.js"]
