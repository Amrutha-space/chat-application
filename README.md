# Full-Featured Chat Application

## Features

- Real-time chat (1:1, group, chatbot)
- Auth (JWT, register/login)
- PostgreSQL via Prisma
- Redis for presence (stub)
- OpenAI GPT chatbot
- Next.js + Tailwind CSS frontend
- Docker Compose for local dev

## Quickstart

### 1. Clone and set up

```sh
git clone https://github.com/youruser/yourrepo.git
cd chat-app
```

### 2. Set environment variables

Create a `.env` file in `server/`:

```
DATABASE_URL=postgresql://chatuser:chatpass@postgres:5432/chatdb?schema=public
REDIS_URL=redis://redis:6379
OPENAI_API_KEY=sk-xxxx
JWT_SECRET=yourjwtsecret
PORT=4000
```

### 3. Install dependencies

```sh
docker compose -f docker/docker-compose.yml run --rm backend npm run prisma migrate deploy
docker compose -f docker/docker-compose.yml run --rm backend npm run prisma generate
docker compose -f docker/docker-compose.yml up --build
```

### 4. Open the app

Visit [http://localhost:3000](http://localhost:3000)

---

## Deployment

- For **cloud**: Use managed Postgres/Redis, deploy backend and frontend containers to AWS ECS/GKE/Azure.
- For **frontend-only**: Deploy `client` on Vercel/Netlify, set `NEXT_PUBLIC_API_URL` to backend server.
- Set up HTTPS (e.g., with Nginx, Let's Encrypt).
- Add monitoring with Sentry/Grafana.

---

## Extending

- Add more rooms, group chat UI
- Add file/image upload (S3, presigned URLs)
- Improve message search, notifications, presence
- Add admin panel and moderation