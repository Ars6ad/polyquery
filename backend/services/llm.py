"""
LLM service for calling various AI model APIs.
Handles OpenAI and other providers with conversation history support.
"""
import os
import openai
from typing import List, Dict, Optional
import time


class LLMService:
    """
    Service for calling LLM APIs.
    Supports OpenAI models with conversation history.
    """
    
    def __init__(self):
        """Initialize LLM service with API keys from environment."""
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        
        if self.openai_api_key:
            openai.api_key = self.openai_api_key
        
        # Model configurations
        self.model_configs = {
            "gpt-4o": {
                "provider": "openai",
                "model": "gpt-4o",
                "input_price": 0.005 / 1000,  # per token
                "output_price": 0.015 / 1000
            },
            "gpt-3.5-turbo": {
                "provider": "openai",
                "model": "gpt-3.5-turbo",
                "input_price": 0.0005 / 1000,
                "output_price": 0.0015 / 1000
            },
            "claude-3.5-sonnet": {
                "provider": "anthropic",
                "model": "claude-3-5-sonnet-20241022",
                "input_price": 0.003 / 1000,
                "output_price": 0.015 / 1000
            },
            "llama-3": {
                "provider": "together",
                "model": "meta-llama/Llama-3-70b-chat-hf",
                "input_price": 0.0006 / 1000,
                "output_price": 0.0006 / 1000
            },
            "gemini-1.5-flash": {
                "provider": "google",
                "model": "gemini-1.5-flash",
                "input_price": 0.000075 / 1000,  # per token
                "output_price": 0.0003 / 1000
            },
            "gemini-1.5-pro": {
                "provider": "google",
                "model": "gemini-1.5-pro",
                "input_price": 0.00125 / 1000,
                "output_price": 0.005 / 1000
            }
        }
    
    def get_available_models(self) -> List[Dict]:
        """Get list of available models with configuration status."""
        return [
            {
                "name": key,
                "configured": self._is_configured(key)
            }
            for key in self.model_configs.keys()
        ]
    
    def _is_configured(self, model_key: str) -> bool:
        """Check if model has required API keys."""
        config = self.model_configs.get(model_key)
        if not config:
            return False
        
        if config["provider"] == "openai":
            return bool(self.openai_api_key)
        elif config["provider"] == "anthropic":
            return bool(os.getenv("ANTHROPIC_API_KEY"))
        elif config["provider"] == "together":
            return bool(os.getenv("TOGETHER_API_KEY"))
        elif config["provider"] == "google":
            return bool(self.google_api_key)
        
        return False
    
    async def call_model(
        self,
        model_key: str,
        conversation_history: List[Dict],
        temperature: float = 0.7
    ) -> Dict:
        """
        Call an LLM model with conversation history.
        
        Args:
            model_key: Model identifier (e.g., "gpt-4o")
            conversation_history: Full conversation history in OpenAI format
            temperature: Sampling temperature
            
        Returns:
            Dict with content, tokens, and cost
            
        Raises:
            Exception: If API call fails
        """
        config = self.model_configs.get(model_key)
        if not config:
            raise ValueError(f"Unknown model: {model_key}")
        
        if not self._is_configured(model_key):
            raise ValueError(f"Model {model_key} not configured or API key missing")
        
        # Add system prompt at the beginning if history is empty or doesn't start with system
        messages = self._prepare_messages(conversation_history)
        
        if config["provider"] == "openai":
            return await self._call_openai(config, messages, temperature)
        elif config["provider"] == "anthropic":
            return await self._call_anthropic(config, messages, temperature)
        elif config["provider"] == "together":
            return await self._call_together(config, messages, temperature)
        elif config["provider"] == "google":
            return await self._call_google(config, messages, temperature)
        else:
            raise ValueError(f"Unsupported provider: {config['provider']}")
    
    def _prepare_messages(self, conversation_history: List[Dict]) -> List[Dict]:
        """
        Prepare messages for API call.
        Adds system prompt if needed.
        
        Args:
            conversation_history: Raw conversation history
            
        Returns:
            Prepared messages list
        """
        if not conversation_history:
            return [{
                "role": "system",
                "content": "You are a helpful AI assistant."
            }]
        
        # If first message is not a system message, add one
        if conversation_history[0]["role"] != "system":
            system_message = {
                "role": "system",
                "content": "You are a helpful AI assistant."
            }
            return [system_message] + conversation_history
        
        return conversation_history
    
    async def _call_openai(
        self,
        config: Dict,
        messages: List[Dict],
        temperature: float
    ) -> Dict:
        """Call OpenAI API."""
        try:
            client = openai.OpenAI(api_key=self.openai_api_key)
            
            response = client.chat.completions.create(
                model=config["model"],
                messages=messages,
                temperature=temperature
            )
            
            content = response.choices[0].message.content
            usage = response.usage
            
            # Calculate cost
            input_tokens = usage.prompt_tokens
            output_tokens = usage.completion_tokens
            cost = (
                input_tokens * config["input_price"] +
                output_tokens * config["output_price"]
            )
            
            return {
                "content": content,
                "tokens": usage.total_tokens,
                "cost": f"{cost:.4f}"
            }
            
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    async def _call_anthropic(
        self,
        config: Dict,
        messages: List[Dict],
        temperature: float
    ) -> Dict:
        """Call Anthropic API (Claude)."""
        # Remove system message and use it as system parameter
        system_content = None
        api_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_content = msg["content"]
            else:
                api_messages.append(msg)
        
        try:
            import anthropic
            
            client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            
            response = client.messages.create(
                model=config["model"],
                max_tokens=4096,
                temperature=temperature,
                system=system_content or "You are a helpful AI assistant.",
                messages=api_messages
            )
            
            content = response.content[0].text
            usage = response.usage
            
            # Calculate cost
            input_tokens = usage.input_tokens
            output_tokens = usage.output_tokens
            cost = (
                input_tokens * config["input_price"] +
                output_tokens * config["output_price"]
            )
            
            return {
                "content": content,
                "tokens": input_tokens + output_tokens,
                "cost": f"{cost:.4f}"
            }
            
        except ImportError:
            raise Exception("Anthropic SDK not installed. Run: pip install anthropic")
        except Exception as e:
            raise Exception(f"Anthropic API error: {str(e)}")
    
    async def _call_together(
        self,
        config: Dict,
        messages: List[Dict],
        temperature: float
    ) -> Dict:
        """Call Together AI API (Llama)."""
        try:
            import httpx
            
            headers = {
                "Authorization": f"Bearer {os.getenv('TOGETHER_API_KEY')}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": config["model"],
                "messages": messages,
                "temperature": temperature
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.together.xyz/v1/chat/completions",
                    headers=headers,
                    json=data,
                    timeout=60.0
                )
                response.raise_for_status()
                result = response.json()
            
            content = result["choices"][0]["message"]["content"]
            usage = result["usage"]
            
            # Calculate cost
            input_tokens = usage.get("prompt_tokens", 0)
            output_tokens = usage.get("completion_tokens", 0)
            cost = (
                input_tokens * config["input_price"] +
                output_tokens * config["output_price"]
            )
            
            return {
                "content": content,
                "tokens": usage.get("total_tokens", 0),
                "cost": f"{cost:.4f}"
            }
            
        except Exception as e:
            raise Exception(f"Together AI API error: {str(e)}")
    
    async def _call_google(
        self,
        config: Dict,
        messages: List[Dict],
        temperature: float
    ) -> Dict:
        """Call Google Gemini API."""
        try:
            import google.generativeai as genai
            import asyncio
            
            genai.configure(api_key=self.google_api_key)
            model = genai.GenerativeModel(config["model"])
            
            # Convert messages to Gemini format
            conversation_parts = []
            system_prompt = None
            
            for msg in messages:
                if msg["role"] == "system":
                    system_prompt = msg["content"]
                    continue
                elif msg["role"] == "user":
                    conversation_parts.append({"role": "user", "parts": [msg["content"]]})
                elif msg["role"] == "model" or msg["role"] == "assistant":
                    conversation_parts.append({"role": "model", "parts": [msg["content"]]})
            
            # Run synchronous Gemini API in thread pool to avoid blocking
            def call_gemini_sync():
                if len(conversation_parts) > 1:
                    # We have history, use chat
                    chat = model.start_chat(history=conversation_parts[:-1])
                    response = chat.send_message(
                        conversation_parts[-1]["parts"][0],
                        generation_config={"temperature": temperature}
                    )
                else:
                    # First message, use generate_content
                    generation_config = {"temperature": temperature}
                    prompt = conversation_parts[0]["parts"][0] if conversation_parts else messages[0]["content"]
                    if system_prompt:
                        # Add system prompt to the first user message
                        prompt = f"{system_prompt}\n\n{prompt}"
                    response = model.generate_content(
                        prompt,
                        generation_config=generation_config
                    )
                return response
            
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, call_gemini_sync)
            
            content = response.text
            estimated_tokens = len(content) // 4  # Rough estimate
            cost = (estimated_tokens * config["input_price"] + estimated_tokens * config["output_price"])
            
            return {
                "content": content,
                "tokens": estimated_tokens * 2,
                "cost": f"{cost:.4f}"
            }
            
        except ImportError:
            raise Exception("Google Generative AI SDK not installed. Run: pip install google-generativeai")
        except Exception as e:
            raise Exception(f"Google Gemini API error: {str(e)}")


