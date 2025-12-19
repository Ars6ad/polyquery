from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class CompareRequest(BaseModel):
    session_id: str = Field(..., description="Unique session identifier")
    prompt: str = Field(..., description="User prompt/question")
    models: List[str] = Field(..., description="List of model keys to query")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)

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

class StatusResponse(BaseModel):
    id: int
    status: str
    completed_at: Optional[str] = None
    response_count: int

class CompareResponse(BaseModel):
    id: int
    message: str
    status: str
