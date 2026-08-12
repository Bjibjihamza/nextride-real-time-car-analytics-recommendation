FROM node:20-alpine AS build

WORKDIR /app

COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY apps/web/ ./

# Public API base URL as seen from the user's browser.
ARG REACT_APP_API_URL=http://localhost:5000
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY infra/docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
