# EventHQ Deployment Guide (Render)

Follow these steps to host your system on Render.

## 1. Database (PostgreSQL)
If you don't have a database yet, create a **PostgreSQL** instance on Render or use a [Neon.tech](https://neon.tech) instance.
- **Connection String**: Copy the external `DATABASE_URL` (starts with `postgres://`).

## 2. Backend Service (Web Service)
1. **Source Code**: Link your GitHub repository.
2. **Environment**: `Node`
3. **Build Command**: `npm install` (run in `backend` folder)
4. **Start Command**: `npm start`
5. **Environment Variables**:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `JWT_SECRET`: A long random string (e.g., `super-secret-123`).
   - `FRONTEND_URL`: The URL of your Frontend service (once created, e.g., `https://eventhq-ui.onrender.com`).
   - `PORT`: 3001 (Render sets this automatically, but keep it explicit if needed).

## 3. Frontend Service (Static Site)
1. **Source Code**: Link your repository.
2. **Build Command**: `npm install && npm run build` (run in `frontend` folder)
3. **Publish Directory**: `frontend/dist`
4. **Environment Variables**:
   - `VITE_API_URL`: The URL of your Backend service (e.g., `https://eventhq-api.onrender.com/api`).

## Important: Directory Structure
Since your project has `backend` and `frontend` in subfolders, you must set the **Root Directory** in Render settings for each service:
- **Backend Service Root**: `backend`
- **Frontend Service Root**: `frontend`

## Deployment Checklist
- [ ] Backend status is "Live".
- [ ] Database schema is initialized (happens automatically on first backend start).
- [ ] Frontend can connect to Backend URL.
- [ ] CORS errors? Double-check `FRONTEND_URL` in the Backend settings.
