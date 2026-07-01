# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-scripts
COPY . .
RUN mkdir -p config public/uploads
EXPOSE 3000
CMD ["node", "server.js"]
