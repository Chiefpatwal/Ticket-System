# Stage 1: build the React app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps && \
    npm install ajv@^8.11.0 ajv-keywords@^5.1.0 --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: serve via Nginx
FROM nginx:1.25-alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
