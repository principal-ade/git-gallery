FROM node:20-alpine AS builder

# Accept NPM token as build argument
ARG NPM_TOKEN

WORKDIR /app

# Configure npm for private packages if token is provided
RUN if [ -n "$NPM_TOKEN" ]; then \
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc; \
    fi

# Install build dependencies for canvas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Copy package files for code-city-landing
COPY code-city-landing/package.json code-city-landing/package-lock.json* ./code-city-landing/

# Copy package files for core library
COPY core/package.json ./core/

# Install and build core library first
WORKDIR /app/core
COPY core/ ./
RUN npm install
RUN npm run build

# Install dependencies for code-city-landing
WORKDIR /app/code-city-landing

# First, install dependencies without scripts to avoid premature builds
RUN npm ci --ignore-scripts

# Install platform-specific binaries for Alpine/musl
RUN npm install \
    @next/swc-linux-x64-musl \
    @tailwindcss/oxide-linux-x64-musl \
    lightningcss-linux-x64-musl \
    --save-optional --force

# Now rebuild all native dependencies for the current platform
RUN npm rebuild

# Run postinstall scripts after native dependencies are ready
RUN npm run postinstall || true

# Copy the rest of code-city-landing
COPY code-city-landing/ ./

# Build the Next.js app
RUN npm run build

# Remove .npmrc to avoid leaking token in the image
RUN rm -f ~/.npmrc

# Production image
FROM node:20-alpine AS runner

# Accept NPM token for installing production dependencies
ARG NPM_TOKEN

WORKDIR /app

ENV NODE_ENV=production

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use installed Chromium instead of downloading
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package.json and package-lock.json
COPY --from=builder /app/code-city-landing/package.json ./
COPY --from=builder /app/code-city-landing/package-lock.json* ./

# Copy the core library build
COPY --from=builder /app/core ./core

# Configure npm for private packages if token is provided
RUN if [ -n "$NPM_TOKEN" ]; then \
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc; \
    fi

# Install production dependencies
# Skip scripts to avoid husky prepare script that requires git hooks
RUN npm install --production --ignore-scripts

# Remove .npmrc after installation for security
RUN rm -f ~/.npmrc

# Copy built app artifacts from builder
COPY --from=builder /app/code-city-landing/.next ./.next
COPY --from=builder /app/code-city-landing/public ./public

# Ensure all files are owned by nextjs user
USER root
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 8080

ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]