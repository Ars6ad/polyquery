# Polyquery FastAPI Backend

FastAPI backend for Polyquery multi-LLM comparison tool with session-based conversation memory.

## Features

- **Session-based memory**: Maintains conversation history per session
- **Multi-model support**: Query multiple LLMs simultaneously
- **Memory management**: Automatic pruning to last 10 user-assistant turns
- **Shared context**: All models in a session share the same conversation history

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file:
```bash
cp .env.example .env
# Edit .env and add your API keys
```

3. Run the server:
```bash
python main.py
# Or with uvicorn:
uvicorn main:app --host 0.0.0.0 --port 3000
```

## API Endpoints

### POST `/api/compare`
Create a new comparison request.

**Request:**
```json
{
  "session_id": "unique-session-id",
  "prompt": "Your question here",
  "models": ["gpt-4o", "claude-3.5-sonnet"],
  "temperature": 0.7
}
```

**Response:**
```json
{
  "id": 1,
  "message": "Comparison started",
  "status": "processing"
}
```

### GET `/api/comparisons/{id}/status`
Check comparison status.

### GET `/api/comparisons/{id}`
Get full comparison results.

## Session Memory

- Each `session_id` maintains its own conversation history
- History is shared across all models in the same session
- Maximum 10 user-assistant turns (20 messages) per session
- Older messages are automatically pruned
- Memory is in-memory only (cleared on server restart)

## Architecture

- `main.py`: FastAPI application and endpoints
- `services/memory.py`: Session memory management
- `services/llm.py`: LLM API integration




