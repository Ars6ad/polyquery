import os
import time
from typing import List, Dict, Any
import google.generativeai as genai
from ..models import ModelResponse

async def call_gemini(model_name: str, messages: List[Dict[str, str]], temperature: float) -> ModelResponse:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return ModelResponse(
            model=model_name,
            error="Missing GOOGLE_API_KEY",
            timestamp=str(time.time())
        )

    start_time = time.time()
    try:
        genai.configure(api_key=api_key)
        
        # Mapping model names if necessary, usually "gemini-pro" etc.
        # Ensure model_name is valid for Gemini API
        gemini_model_name = "gemini-pro" if "pro" in model_name else "gemini-1.5-flash"
        if "1.5" in model_name: gemini_model_name = model_name 
        
        model = genai.GenerativeModel(gemini_model_name)
        
        # Convert messages to Gemini format
        # Gemini expects history as a list of contents, but chat session is easier
        # We will use the chat history
        
        chat_history = []
        last_message = ""
        
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            if msg["role"] == "system":
                # Gemini doesn't strictly support system messages in chat history efficiently in all versions
                # We'll prepend it to the next user message or ignore if needed.
                # simpler: ignore for MVP or prepend to first message
                continue
                
            if role == "user":
                 last_message = msg["content"]
            
            # Construct history for context (excluding the very last message which is the prompt)
            # Actually, `start_chat` takes history.
        
        # Re-formatting for google.generativeai
        # It wants [{'role': 'user', 'parts': ['...']}, ...]
        
        gemini_history = []
        system_instruction = None
        
        for msg in messages[:-1]: # All except last one
            if msg["role"] == "system":
                system_instruction = msg["content"]
                continue
                
            role = "user" if msg["role"] == "user" else "model"
            gemini_history.append({
                "role": role,
                "parts": [msg["content"]]
            })
            
        last_user_msg = messages[-1]["content"] if messages else ""
        
        if system_instruction:
           # Prepend system instruction to the latest prompt or separate?
           # New Gemini models support system_instruction in GenerativeModel constructor
           model = genai.GenerativeModel(gemini_model_name, system_instruction=system_instruction)

        chat = model.start_chat(history=gemini_history)
        
        response = await chat.send_message_async(
            last_user_msg,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature
            )
        )
        
        content = response.text
        # Token counting might need a separate call, or just estimate
        # usage_metadata is available in newer versions
        tokens = 0
        if hasattr(response, "usage_metadata"):
             tokens = response.usage_metadata.total_token_count
        
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
