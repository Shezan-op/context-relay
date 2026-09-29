# Deployment Guide & Runtime Environment

This guide details the technical requirements, configuration variables, runtime assumptions, and deployment strategies for ContextRelay in staging and production environments.

---

## 1. System Requirements & Runtime

- **Node.js:** v18.17.0 or v20.x LTS (Recommended: Node 20 LTS).
- **Package Manager:** `npm` v9+ (or `pnpm` / `yarn`).
- **Operating System:** Linux (Ubuntu 22.04+, Debian 12, Alpine 3.19+), macOS 13+, or Windows 11.
- **Embedded Database:** Uses Node.js built-in `node:sqlite` (`DatabaseSync`), requiring zero external native compilation dependencies or C++ build tools.

---

## 2. Environment Configuration

ContextRelay reads configuration from environment variables (or `.env.local` during local development).

| Variable | Required | Default Value | Description |
| :--- | :---: | :--- | :--- |
| `HINDSIGHT_API_KEY` | **Yes** | `None` | Authentication token for the Hindsight memory engine. |
| `HINDSIGHT_BASE_URL` | No | `https://api.hindsight.vectorize.io` | Hindsight endpoint URL (override for private VPC or self-hosted instances). |
| `GROQ_API_KEY` | Conditional* | `None` | API key for Groq inference (Default model: `llama-3.3-70b-versatile`). |
| `OPENAI_API_KEY` | Conditional* | `None` | API key for OpenAI inference (`gpt-4o-mini`). |
| `ANTHROPIC_API_KEY` | Conditional* | `None` | API key for Anthropic inference (`claude-3-5-sonnet-20241022`). |
| `GEMINI_API_KEY` | Conditional* | `None` | API key for Google Gemini inference (`gemini-1.5-flash`). |
| `DATA_DIR` | No | `./data` | File system path for the SQLite database (`context_relay.db`). |
| `PORT` | No | `3000` | HTTP port for the Next.js server. |

*\*Note: At least one LLM API key must be provided. The system auto-detects available providers in the order: Groq → OpenAI → Anthropic → Gemini.*

---

## 3. Build & Execution Pipeline

```bash
# 1. Install production and build dependencies
npm ci

# 2. Execute automated verification tests
npm test

# 3. Compile optimized Next.js production bundle
npm run build

# 4. Start production web server
npm start
```

---

## 4. Deployment Topologies

### Topology A: Docker Container / Persistent VPS (Recommended)

Because ContextRelay utilizes Node.js built-in `node:sqlite` for fast, zero-dependency metadata storage, running on a persistent container or VPS with mounted disk storage is the recommended topology.

#### Dockerfile Example

```dockerfile
FROM node:20-slim AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Create data directory for SQLite volume mount
RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

CMD ["npm", "start"]
```

#### Volume Mounting

When deploying with Docker, mount a host directory or persistent block volume to `/app/data`:

```bash
docker run -d \
  --name context-relay \
  -p 3000:3000 \
  -v /var/data/context-relay:/app/data \
  -e HINDSIGHT_API_KEY="your-hindsight-key" \
  -e GROQ_API_KEY="your-groq-key" \
  context-relay:latest
```

---

### Topology B: PaaS Providers (Railway, Render, Fly.io)

When deploying to PaaS platforms:
1. Ensure a **Persistent Volume** is attached to the service.
2. Set the `DATA_DIR` environment variable to the mount point (e.g., `/mnt/data`).
3. Set your `HINDSIGHT_API_KEY` and LLM provider key in the platform dashboard.

---

### Topology C: Serverless Platforms (Vercel, Netlify, AWS Lambda) — Critical Warning

> [!WARNING]
> Serverless platforms use ephemeral execution containers. In standard serverless deployments, the local SQLite database at `data/context_relay.db` will be wiped whenever a serverless lambda function spins down.
> 
> To deploy on Vercel or AWS Lambda, you must either:
> 1. Mount an external network volume (e.g., AWS EFS for Lambda), or
> 2. Replace the `node:sqlite` driver in `src/lib/db.ts` with a cloud-hosted SQL adapter (e.g., Turso / LibSQL, Neon Postgres, or Supabase).

---

## 5. Security & Reverse Proxy Recommendations

In production agency environments:
1. **TLS / SSL Termination:** Place ContextRelay behind Nginx, Caddy, or Cloudflare with modern TLS 1.3 encryption.
2. **Access Control:** Since ContextRelay does not implement internal user authentication, configure HTTP Basic Auth, Cloudflare Access (Zero Trust), Tailscale VPN, or an OAuth2 reverse proxy (e.g., `oauth2-proxy`) at the network boundary.
3. **Payload Limits:** Configure your reverse proxy to allow file uploads up to 10MB (the application code enforces a strict 5MB limit per transcript).
