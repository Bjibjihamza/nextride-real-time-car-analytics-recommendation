FROM node:20-alpine

WORKDIR /app

COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY apps/api/ ./

RUN mkdir -p images/cars/temp images/cars

EXPOSE 5000

CMD ["node", "server.js"]
