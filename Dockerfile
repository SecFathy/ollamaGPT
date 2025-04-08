FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the React application
RUN npm run build

# Expose the port the application runs on
EXPOSE 5000

# Start the application
CMD ["npm", "run", "start"]