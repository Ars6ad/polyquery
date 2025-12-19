import os
import time
from typing import List, Dict, Any
import groq
from ..models import ModelResponse

async def call_groq(model_name: str, messages: List[Dict[str, str]], temperature: float) -> ModelResponse:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return ModelResponse(
            model=model_name,
            error="Missing GROQ_API_KEY",
            timestamp=str(time.time())
        )

    start_time = time.time()
    try:
        # Map generic names to Groq specific model names if needed
        # Groq supports: llama3-8b-8192, llama3-70b-8192, mixtral-8x7b-32768
        groq_model = model_name
        if "llama-3" in model_name:
            groq_model = "llama3-70b-8192" 
        elif "mixtral" in model_name:
            groq_model = "mixtral-8x7b-32768"
        elif "gemma" in model_name:
             groq_model = "gemma-7b-it"

        client = groq.AsyncGroq(api_key=api_key)
        
        # Groq format is compatible with OpenAI messages
        response = await client.chat.completions.create(
            model=groq_model,
            messages=messages,
            temperature=temperature
        )
        
        content = response.choices[0].message.content
        tokens = response.usage.total_tokens
        latency = time.time() - start_time
        
        return ModelResponse(
            model=model_name,
            content=content,
            latency=round(latency, 3),
            tokens=tokens,
            timestamp=str(time.time())
        )
    except Exception as e:
        return ModelResponse(
            model=model_name,
            error=str(e),
            latency=round(time.time() - start_time, 3),
            timestamp=str(time.time())
        )
