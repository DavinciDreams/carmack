# Carmack Coder Production Docker Image
FROM oven/bun:alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    openssh-client \
    ca-certificates \
    dafny \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Create workspace directory
RUN mkdir -p /tmp/carmack-workspace

# Build the application
RUN bun run build

# Set environment variables
ENV NODE_ENV=production
ENV CARMACK_WORKSPACE=/tmp/carmack-workspace
ENV CARMACK_LOG_LEVEL=info

# Create non-root user for security
RUN addgroup -g 1001 -S carmack && \
    adduser -S carmack -u 1001

# Set proper permissions
RUN chown -R carmack:carmack /app /tmp/carmack-workspace

# Switch to non-root user
USER carmack

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD bun run production.ts --help || exit 1

# Default command
ENTRYPOINT ["bun", "run", "production.ts"]
CMD ["--help"]
