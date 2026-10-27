# Multi-stage build for VIECODIE — AI Code Reviewer by Graph
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build CLI & Web
COPY . .
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy production package files
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/examples ./examples
COPY --from=builder /app/benchmark ./benchmark

# Expose Web Reviewer and API ports
EXPOSE 4747
EXPOSE 5173

# Entrypoint
ENTRYPOINT ["node", "dist/cli.js"]
CMD ["review", "--help"]
