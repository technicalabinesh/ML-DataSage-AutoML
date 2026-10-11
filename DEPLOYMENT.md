# Deployment Guide — AutoML Analyst AI

This project is fully configured for continuous deployment using **Render Blueprints** as well as local or cloud **Docker Compose**.

---

## Method 1: Cloud Deployment via Render Blueprint (Recommended)

Render Blueprints allow you to deploy both the FastAPI backend and React frontend with a single click, with automatic HTTPS and environment variable linking.

### Step 1: Push Code to GitHub

1. Create a new repository on GitHub:
   - Go to [github.com/new](https://github.com/new)
   - Repository name: `automl-analyst-ai` (or your preferred name)
   - Choose **Public** or **Private** (Render supports both)
   - Do **NOT** initialize with README, .gitignore, or license (already included)

2. Link and push your local repository:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<REPO_NAME>.git
   git push -u origin main
   ```

---

### Step 2: Deploy on Render

1. Open the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top navigation and select **Blueprint**.
3. Connect your GitHub account and select your `automl-analyst-ai` repository.
4. Render will parse [`render.yaml`](./render.yaml) and display:
   - **`automl-analyst-backend`** (Python 3.11 Web Service)
   - **`automl-analyst-frontend`** (Static Site with SPA rewrite rules)
5. Under Environment Variables for `automl-analyst-backend`:
   - Set **`GEMINI_API_KEY`**: Enter your Google Gemini API key (optional for core ML, required for Gemini AI analyst).
6. Click **Apply**.

Render will automatically:
- Provision the Python FastAPI backend, install dependencies, and launch Uvicorn.
- Inject the backend's live URL into `VITE_BACKEND_URL`.
- Build the Vite React frontend and publish the static distribution.
- Assign free public `https://...` endpoints for both services.

---

## Method 2: Local or Server Deployment via Docker Compose

If you want to run the full production stack on your local machine or a Linux VPS:

```bash
# 1. Provide your Gemini API key (optional)
# Edit .env or set environment variable:
export GEMINI_API_KEY="your-gemini-api-key"

# 2. Build and start containers
docker compose up --build -d

# 3. Access services:
# - Frontend: http://localhost:80
# - Backend API: http://localhost:8000
# - Swagger Docs: http://localhost:8000/docs
```

To stop containers:
```bash
docker compose down
```

---

## Architecture Overview

| Component | Technology | Configuration File | Port / Path |
|---|---|---|---|
| **Backend API** | FastAPI + Uvicorn (Python 3.11) | [`Dockerfile.backend`](./Dockerfile.backend), [`requirements.txt`](./requirements.txt) | `:8000` (`/` & `/docs`) |
| **Frontend** | React + Vite + TailwindCSS | [`Dockerfile.frontend`](./Dockerfile.frontend), [`render.yaml`](./render.yaml) | `:80` / Static SPA |
| **Blueprint** | Render Infrastructure-as-Code | [`render.yaml`](./render.yaml) | Blueprint Orchestration |
