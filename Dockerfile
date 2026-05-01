FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Expose Backend default port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "start:dev"]
