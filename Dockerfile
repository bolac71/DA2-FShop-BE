# -------- STAGE 1: Build --------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


# -------- STAGE 2: Production --------
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

RUN apk add --no-cache curl

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:$PORT/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
