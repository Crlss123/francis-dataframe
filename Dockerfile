FROM node:18-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files and config
COPY package*.json ./
COPY tsconfig.json ./

# Copy source code before installing (needed for build)
COPY src/ ./src/

# Install and build
RUN npm ci

# Create user for security
RUN addgroup -g 1001 -S tooluser && \
    adduser -S tooluser -u 1001 -G tooluser

# Set ownership and switch to non-root user
RUN chown -R tooluser:tooluser /app
USER tooluser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
