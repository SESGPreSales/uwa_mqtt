# Use the official Node.js 18 LTS image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install deps
RUN npm install --production

# Copy app source
COPY . .

# Expose whatever port your app listens on
# EXPOSE 3000

# Default start command
CMD ["node", "index.js"]