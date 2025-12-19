import os
import time
from typing import List, Dict, Any
import openai
from ..models import ModelResponse

async def call_openai(model_name: str, messages: List[Dict[str, str]], temperature: float) -> ModelResponse:
    openai.api_key = os.getenv("OPENAI_API_KEY")
    if not openai.api_key:
        return ModelResponse(
            model=model_name,
            error="Missing OPENAI_API_KEY",
            timestamp=str(time.time())
        )

    start_time = time.time()
    try:
        # Convert messages if needed, but OpenAI format is standard
        # Ensure system prompt is present if not in messages
        
        client = openai.AsyncOpenAI(api_key=openai.api_key)
        
        response = await client.chat.completions.create(
            model=model_name,
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
