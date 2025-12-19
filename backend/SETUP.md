# FastAPI Backend Setup

## Quick Start

1. **Install Python dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Set up environment variables:**
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env and add your API keys
# At minimum, add OPENAI_API_KEY for GPT models
```

3. **Run the server:**
```bash
# Option 1: Using Python directly
python main.py

# Option 2: Using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 3000 --reload

# Option 3: Using the run script
python run.py
```

4. **Access the app:**
- Frontend: http://localhost:3000
- API docs: http://localhost:3000/docs
- Health check: http://localhost:3000/api/health

## Features

✅ **Session-based memory**: Each session maintains its own conversation history  
✅ **Shared context**: All models in a session share the same conversation  
✅ **Auto-pruning**: Keeps last 10 user-assistant turns (20 messages max)  
✅ **Multi-model support**: Query multiple LLMs simultaneously  
✅ **Production-ready**: Clean separation of concerns, proper error handling  

## Architecture

```
backend/
├── main.py              # FastAPI app and endpoints
├── services/
│   ├── memory.py        # Session memory management
│   └── llm.py           # LLM API integration
├── requirements.txt     # Python dependencies
└── run.py              # Run script
```

## API Endpoints

- `POST /api/compare` - Create comparison (requires session_id)
- `GET /api/comparisons/{id}/status` - Check status
- `GET /api/comparisons/{id}` - Get results
- `GET /api/comparisons` - List all comparisons
- `GET /api/health` - Health check

## Session Memory

- Each request includes a `session_id`
- Conversation history is maintained per session
- History is shared across all models in the same session
- Maximum 10 turns (20 messages) per session
- Older messages are automatically discarded

## Notes

- Memory is in-memory only (cleared on server restart)
- No database required
- No authentication (add as needed)
- Frontend automatically generates session_id




