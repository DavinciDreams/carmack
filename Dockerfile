# Carmack Coder Production Docker Image
FROM oven/bun:alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    openssh-client \
    ca-certificates \
    curl \
    unzip \
    dotnet6-sdk \
    icu-data-full \
    && rm -rf /var/cache/apk/*

# Install Dafny manually (latest release)
RUN apk add --no-cache jq
RUN echo "Available Dafny assets:" \
    && curl -s https://api.github.com/repos/dafny-lang/dafny/releases/latest | jq -r '.assets[].name'

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Create workspace directory
RUN mkdir -p /workspace && chown -R 1001:1001 /workspace

# Build the application
RUN bun run build

# Set environment variables
ENV NODE_ENV=production
ENV CARMACK_WORKSPACE=/workspace
ENV CARMACK_LOG_LEVEL=info

# Create non-root user for security
RUN addgroup -g 1001 -S carmack && \
    adduser -S carmack -u 1001

# Set proper permissions
RUN chown -R carmack:carmack /app /workspace

# Switch to non-root user
USER carmack

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD bun run production.ts --help || exit 1

# Default command
ENTRYPOINT ["bun", "run", "production.ts"]
CMD ["--help"]
