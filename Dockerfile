# ==============================================================================
# Production Dockerfile for Modular Hospital Management System
# Zero external runtime dependencies - Built on Node.js 22 LTS (Native node:sqlite)
# ==============================================================================

FROM node:22-alpine AS runtime

# Install curl for container HEALTHCHECK
RUN apk add --no-cache curl tzdata

# Set environment
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DB_PATH=/app/data/hospital.db

# Create application directory
WORKDIR /app

# Create data directory with proper ownership
RUN mkdir -p /app/data && chown -R node:node /app

# Copy application files
COPY --chown=node:node package.json server.js ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node public/ ./public/

# Switch to non-privileged node user for security
USER node

# Expose HTTP port
EXPOSE 3000

# Persistent volume for SQLite database
VOLUME ["/app/data"]

# Native Healthcheck against server /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start Hospital Management System
CMD ["node", "server.js"]

