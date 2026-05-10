FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY app.js ./

EXPOSE 3000

CMD ["node", "-e", "console.log('App running'); require('./app')"]
