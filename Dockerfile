# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:22-slim AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ============================================
# Stage 2: Final minimal image
# ============================================
FROM node:22-slim

# Install Chrome and required dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    fonts-noto-color-emoji \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxext6 \
    libxfixes3 \
    libnss3 \
    libnspr4 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libxshmfence1 \
    --no-install-recommends && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Create non-root user with home directory
RUN groupadd -r wcaguser && useradd -r -g wcaguser -G audio,video -m -d /home/wcaguser wcaguser

# Set working directory
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps --chown=wcaguser:wcaguser /app/node_modules ./node_modules
COPY --from=deps --chown=wcaguser:wcaguser /app/package*.json ./

# Copy application code
COPY --chown=wcaguser:wcaguser src/ ./src/

# Create directories and set permissions
RUN mkdir -p /app/reports /app/logs /tmp/chromium && \
    chown -R wcaguser:wcaguser /app && \
    chmod 1777 /tmp && \
    chown -R wcaguser:wcaguser /tmp/chromium

# Switch to non-root user
USER wcaguser

# Set Puppeteer to use installed Google Chrome
ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    TMPDIR=/tmp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Run the MCP server
CMD ["node", "src/index.js"]
