# ==========================================
# EquiFlow Frontend Dockerfile (Vite + Nginx)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Biến môi trường build time cho Vite
ARG VITE_API_URL=http://localhost:3000/api

ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ==========================================
# Production Web Server Stage (Nginx Alpine)
# ==========================================
FROM nginx:alpine AS runner

# Copy cấu hình Nginx SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts từ builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
