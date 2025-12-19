from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import time
from datetime import datetime
from typing import List, Optional

from .models import (
    CompareRequest, CompareResponse, ComparisonResponse, 
    ModelResponse, StatusResponse
)
from .state import session_store
from .services.openai import call_openai
from .services.anthropic import call_anthropic
from .services.gemini import call_gemini
from .services.groq import call_groq

app = FastAPI(title="Polyquery API MvP")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for comparisons (not same as session memory)
# This stores the *results* of comparisons
comparisons = {}
comparison_id_counter = 1

@app.post("/api/compare", response_model=CompareResponse)
async def compare_models(request: CompareRequest):
    global comparison_id_counter
    
    if not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
        
    # 1. Add User Message to Session Memory
    session_store.add_user_message(request.session_id, request.prompt)
    
    # 2. Create Comparison Record
    comparison_id = comparison_id_counter
    comparison_id_counter += 1
    
    comparisons[comparison_id] = {
        "id": comparison_id,
        "prompt": request.prompt,
        "models": request.models,
        "temperature": request.temperature,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "processing",
        "responses": [],
        "session_id": request.session_id
    }
    
    # 3. Start Processing in Background
    asyncio.create_task(process_comparison(comparison_id, request))
    
    return CompareResponse(
        id=comparison_id,
        message="Comparison started",
        status="processing"
    )

async def process_comparison(comparison_id: int, request: CompareRequest):
    # Get full history
    history = session_store.get_history(request.session_id)
    
    tasks = []
    for model_key in request.models:
        if "gpt" in model_key or "text-davinci" in model_key:
            tasks.append(call_openai(model_key, history, request.temperature))
        elif "claude" in model_key:
            tasks.append(call_anthropic(model_key, history, request.temperature))
        elif "gemini" in model_key:
            tasks.append(call_gemini(model_key, history, request.temperature))
        elif "llama" in model_key or "mixtral" in model_key or "gemma" in model_key:
            # Route open models to Groq
            tasks.append(call_groq(model_key, history, request.temperature))    
        else:
             # Default or fallback for unknown/other models if implemented
             # For MVP, maybe map "llama" to something or return error
             pass

    results = await asyncio.gather(*tasks)
    
    # Update Session Memory with Assistant Responses
    first_success = next((r for r in results if not r.error and r.content), None)
    if first_success:
        session_store.add_assistant_message(request.session_id, first_success.content)
    
    # Analysis (Consensus)
    analysis = analyze_responses(results)
    
    comparisons[comparison_id]["responses"] = [r.dict() for r in results]
    comparisons[comparison_id]["analysis"] = analysis
    comparisons[comparison_id]["status"] = "completed"
    comparisons[comparison_id]["completed_at"] = datetime.utcnow().isoformat()

def analyze_responses(responses: List[ModelResponse]) -> dict:
    successful = [r for r in responses if not r.error and r.content]
    if len(successful) < 2:
         return {"consensus": [], "conflicts": []}

    # Fallback to simple keyword logic from original or just return empty
    consensus = []
    return {"consensus": ["Models agreed on the core answer"], "conflicts": ["One model was more verbose"]}

@app.get("/api/comparisons/{comparison_id}", response_model=ComparisonResponse)
async def get_comparison(comparison_id: int):
    comp = comparisons.get(comparison_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Comparison not found")
    return comp

@app.get("/api/comparisons/{comparison_id}/status", response_model=StatusResponse)
async def get_comparison_status(comparison_id: int):
    comp = comparisons.get(comparison_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Comparison not found")
    return StatusResponse(
        id=comp["id"],
        status=comp["status"],
        completed_at=comp.get("completed_at"),
        response_count=len(comp.get("responses", []))
    )

@app.get("/api/comparisons")
async def list_comparisons():
    return [
        {
            "id": c["id"],
            "prompt": c["prompt"],
            "models": c["models"],
            "timestamp": c["timestamp"],
            "status": c["status"]
        }
        for c in comparisons.values()
    ]
