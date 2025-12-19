"""
Polyquery FastAPI Backend
Multi-LLM comparison with session-based conversation memory
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Optional
import os
from datetime import datetime
import asyncio

from services.llm import LLMService
from services.memory import MemoryService

app = FastAPI(title="Polyquery API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
llm_service = LLMService()
memory_service = MemoryService()


# Request/Response Models
class CompareRequest(BaseModel):
    session_id: str = Field(..., description="Unique session identifier")
    prompt: str = Field(..., description="User prompt/question")
    models: List[str] = Field(..., description="List of model keys to query")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)


class CompareResponse(BaseModel):
    id: int
    message: str
    status: str


class StatusResponse(BaseModel):
    id: int
    status: str
    completed_at: Optional[str] = None
    response_count: int


class Message(BaseModel):
    role: str
    content: str


class ModelResponse(BaseModel):
    model: str
    content: Optional[str] = None
    latency: Optional[float] = None
    tokens: Optional[int] = None
    cost: Optional[str] = None
    error: Optional[str] = None
    timestamp: str


class ComparisonResponse(BaseModel):
    id: int
    prompt: str
    models: List[str]
    temperature: float
    timestamp: str
    status: str
    responses: List[ModelResponse]
    analysis: Optional[dict] = None
    completed_at: Optional[str] = None


# In-memory comparison store
comparisons = {}
comparison_id_counter = 1


@app.post("/api/compare", response_model=CompareResponse)
async def compare_models(request: CompareRequest):
    """
    Create a new comparison request.
    Adds user prompt to session memory and processes models asynchronously.
    """
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    if not request.models or len(request.models) == 0:
        raise HTTPException(status_code=400, detail="At least one model is required")
    
    # Create comparison entry
    comparison_id = comparison_id_counter
    comparison_id_counter += 1
    
    comparison = {
        "id": comparison_id,
        "prompt": request.prompt,
        "models": request.models,
        "temperature": request.temperature,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "processing",
        "responses": [],
        "session_id": request.session_id
    }
    
    comparisons[comparison_id] = comparison
    
    # Process models asynchronously
    asyncio.create_task(process_comparison(comparison_id, request))
    
    return CompareResponse(
        id=comparison_id,
        message="Comparison started",
        status="processing"
    )


async def process_comparison(comparison_id: int, request: CompareRequest):
    """
    Process comparison asynchronously.
    Appends user prompt to session memory, queries models with full history,
    and updates comparison with results.
    """
    try:
        comparison = comparisons.get(comparison_id)
        if not comparison:
            print(f"Warning: Comparison {comparison_id} not found")
            return
        
        responses = []
        
        # Add user message to session memory
        memory_service.add_user_message(request.session_id, request.prompt)
        
        # Get conversation history for this session
        conversation_history = memory_service.get_history(request.session_id)
        
        # Process each model
        for model_key in request.models:
            try:
                start_time = datetime.utcnow()
                
                # Call LLM with full conversation history
                result = await llm_service.call_model(
                    model_key=model_key,
                    conversation_history=conversation_history,
                    temperature=request.temperature
                )
                
                latency = (datetime.utcnow() - start_time).total_seconds()
                
                # Add assistant response to session memory
                memory_service.add_assistant_message(request.session_id, result["content"], model_key)
                
                responses.append(ModelResponse(
                    model=model_key,
                    content=result["content"],
                    latency=round(latency, 2),
                    tokens=result.get("tokens", 0),
                    cost=result.get("cost", "0.0000"),
                    timestamp=datetime.utcnow().isoformat()
                ))
                
            except Exception as error:
                error_msg = str(error)
                print(f"Error processing {model_key}: {error_msg}")
                responses.append(ModelResponse(
                    model=model_key,
                    error=error_msg,
                    timestamp=datetime.utcnow().isoformat()
                ))
        
        # Analyze responses
        analysis = analyze_responses(responses)
        
        # Update comparison
        comparison["responses"] = [r.dict() for r in responses]
        comparison["analysis"] = analysis
        comparison["status"] = "completed"
        comparison["completed_at"] = datetime.utcnow().isoformat()
        
    except Exception as e:
        print(f"Error in process_comparison: {str(e)}")
        import traceback
        traceback.print_exc()
        # Update comparison with error status
        if comparison_id in comparisons:
            comparisons[comparison_id]["status"] = "error"
            comparisons[comparison_id]["error"] = str(e)


@app.get("/api/comparisons/{comparison_id}/status", response_model=StatusResponse)
async def get_comparison_status(comparison_id: int):
    """Get the status of a comparison."""
    comparison = comparisons.get(comparison_id)
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparison not found")
    
    return StatusResponse(
        id=comparison["id"],
        status=comparison["status"],
        completed_at=comparison.get("completed_at"),
        response_count=len(comparison.get("responses", []))
    )


@app.get("/api/comparisons/{comparison_id}", response_model=ComparisonResponse)
async def get_comparison(comparison_id: int):
    """Get full comparison results."""
    comparison = comparisons.get(comparison_id)
    if not comparison:
        raise HTTPException(status_code=404, detail="Comparison not found")
    
    return ComparisonResponse(**comparison)


@app.get("/api/comparisons")
async def list_comparisons():
    """List all comparisons (for history)."""
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


@app.get("/api/search")
async def search_comparisons(query: Optional[str] = None):
    """Search comparisons by prompt text."""
    if not query:
        return list_comparisons()
    
    query_lower = query.lower()
    return [
        {
            "id": c["id"],
            "prompt": c["prompt"],
            "models": c["models"],
            "timestamp": c["timestamp"],
            "status": c["status"]
        }
        for c in comparisons.values()
        if query_lower in c["prompt"].lower()
    ]


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "models": llm_service.get_available_models()
    }


@app.delete("/api/comparisons/{comparison_id}")
async def delete_comparison(comparison_id: int):
    """Delete a comparison."""
    if comparison_id not in comparisons:
        raise HTTPException(status_code=404, detail="Comparison not found")
    
    del comparisons[comparison_id]
    return {"message": "Comparison deleted"}


def analyze_responses(responses: List[ModelResponse]) -> dict:
    """
    Simple analysis of responses for consensus and conflicts.
    In production, use NLP/AI for better analysis.
    """
    successful_responses = [r for r in responses if not r.error and r.content]
    
    if len(successful_responses) < 2:
        return {"consensus": [], "conflicts": []}
    
    consensus = []
    conflicts = []
    
    # Simple keyword-based analysis
    keywords = ['complexity', 'recursive', 'iterative', 'O(n)', 'O(2^n)']
    
    for keyword in keywords:
        mentioned_by = [
            r.model for r in successful_responses
            if keyword.lower() in r.content.lower()
        ]
        
        if len(mentioned_by) == len(successful_responses):
            consensus.append({
                "text": f"All models discussed {keyword}",
                "models": mentioned_by
            })
        elif len(mentioned_by) > 0:
            conflicts.append({
                "text": f"{keyword} mentioned only by: {', '.join(mentioned_by)}",
                "models": mentioned_by
            })
    
    return {"consensus": consensus, "conflicts": conflicts}


# Serve static files and frontend (must be after API routes)
@app.get("/")
async def read_root():
    """Serve index.html"""
    public_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
    index_path = os.path.join(public_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found. Make sure public/index.html exists."}

# Serve static assets (CSS, JS, etc.) - catch-all route must be last
@app.get("/{file_path:path}")
async def serve_static(file_path: str):
    """Serve static files from public directory"""
    # Don't interfere with API routes
    if file_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    
    public_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
    file_full_path = os.path.join(public_dir, file_path)
    
    # Security: prevent directory traversal
    if not os.path.abspath(file_full_path).startswith(os.path.abspath(public_dir)):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if os.path.exists(file_full_path) and os.path.isfile(file_full_path):
        return FileResponse(file_full_path)
    
    raise HTTPException(status_code=404, detail="File not found")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 3000))
    uvicorn.run(app, host="0.0.0.0", port=port)

