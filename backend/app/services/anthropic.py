import os
import time
from typing import List, Dict, Any
import anthropic
from ..models import ModelResponse

async def call_anthropic(model_name: str, messages: List[Dict[str, str]], temperature: float) -> ModelResponse:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return ModelResponse(
            model=model_name,
            error="Missing ANTHROPIC_API_KEY",
            timestamp=str(time.time())
        )

    start_time = time.time()
    try:
        client = anthropic.AsyncAnthropic(api_key=api_key)
        
        # Anthropic requires system prompt to be separate parameter usually, 
        # or it supports it in messages but strictly.
        # We will filter out system message if it exists in the history and pass it as system param
        
        system_prompt = "You are a helpful AI assistant."
        filtered_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_prompt = msg["content"]
            else:
                filtered_messages.append(msg)
                
        response = await client.messages.create(
            model=model_name,
            messages=filtered_messages,
            system=system_prompt,
            temperature=temperature,
            max_tokens=4096
        )
        
        content = response.content[0].text
        tokens = response.usage.input_tokens + response.usage.output_tokens
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
