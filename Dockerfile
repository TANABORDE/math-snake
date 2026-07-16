# =========================================
# Math Snake — production image
# ใช้กับ Fly.io free tier (shared-cpu-1x, 256MB)
# =========================================
FROM node:20-alpine

WORKDIR /app

# ติดตั้ง dependencies เฉพาะ production (cache layer)
COPY package*.json ./
RUN npm ci --omit=dev

# copy source
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# ไม่ต้องใช้ dumb-init เพราะ node จับ SIGTERM ได้เอง
CMD ["node", "server/index.js"]
