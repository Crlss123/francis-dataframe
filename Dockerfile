FROM node:20

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl

# Copy package files and config
COPY package*.json ./
COPY tsconfig.json ./

# Copy source code before installing (needed for build)
COPY src/ ./src/

# Install and build
RUN npm ci

# Create a non-root user
RUN groupadd -g 1001 tooluser && \
    useradd -m -u 1001 -g tooluser tooluser

# Set ownership and switch to non-root user
RUN chown -R tooluser:tooluser /app
USER tooluser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
