# Backend

Move server logic into `src/` and keep root `server.js` as the entry point.

Env vars (see `.env.example`):
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `DEFAULT_MODEL` - default LLM model name (optional)

Start:
```bash
cd backend
npm install
node server.js
```
