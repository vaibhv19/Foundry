# Foundry

Smart Start-up Blueprint Generator.

## Project Structure
- `backend/`: Django REST Framework backend with Celery & Channels.
- `frontend/`: React + Vite frontend using Zustand and Tailwind CSS.
- `Docs/`: Architecture and implementation documentation.

## Quickstart (Docker Compose)
1. Make sure you have your Gemini API Key.
2. Copy `backend/.env.example` to `backend/.env` and update `GEMINI_API_KEY`:
   ```bash
   cp backend/.env.example backend/.env
   ```
3. Run the application services using Docker Compose:
   ```bash
   docker-compose up --build
   ```

## Running Locally (Without Docker)
If you run without Docker, ensure Redis is running first, then follow this exact startup order:
1. **Redis**: Ensure Redis runs on port 6379.
2. **Backend**: Install dependencies and migrate database, then start Daphne ASGI server:
   ```bash
   cd backend
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver 0.0.0.0:8000
   ```
3. **Celery Worker**: Launch the background worker in a separate terminal:
   ```bash
   cd backend
   celery -A foundry_backend worker --loglevel=info
   ```
   > [!IMPORTANT]
   > **Windows OS Developer Alert**: Celery on Windows does not support default prefork pools. You MUST start the worker with the threads or solo pool flag:
   > `celery -A foundry_backend worker --loglevel=info -P threads`
4. **Frontend**: Install dependencies and launch Vite server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

For detailed architecture explanations, refer to [01_Local_Dev_Environment.md](file:///d:/Coding/Projects----For%20Resume/Foundry/Docs/Learning/01_Local_Dev_Environment.md).
