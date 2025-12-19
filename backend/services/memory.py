"""
Session-based conversation memory management.
Maintains conversation history per session with automatic pruning.
"""
from typing import List, Dict
from collections import defaultdict


class MemoryService:
    """
    Manages session-based conversation memory.
    
    Memory structure:
    {
        session_id: [
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": "...", "model": "gpt-4o"},
            ...
        ]
    }
    
    Hard cap: Last 10 user-assistant turns (20 messages max).
    """
    
    def __init__(self, max_turns: int = 10):
        """
        Initialize memory service.
        
        Args:
            max_turns: Maximum number of user-assistant turn pairs to keep
        """
        self.memory: Dict[str, List[Dict]] = defaultdict(list)
        self.max_turns = max_turns
        self.max_messages = max_turns * 2  # Each turn = user + assistant
    
    def add_user_message(self, session_id: str, content: str):
        """
        Add a user message to session memory.
        
        Args:
            session_id: Session identifier
            content: User message content
        """
        self.memory[session_id].append({
            "role": "user",
            "content": content
        })
        self._prune_memory(session_id)
    
    def add_assistant_message(self, session_id: str, content: str, model: str):
        """
        Add an assistant message to session memory.
        
        Args:
            session_id: Session identifier
            content: Assistant response content
            model: Model that generated the response
        """
        self.memory[session_id].append({
            "role": "assistant",
            "content": content,
            "model": model
        })
        self._prune_memory(session_id)
    
    def get_history(self, session_id: str) -> List[Dict]:
        """
        Get conversation history for a session.
        Returns messages in OpenAI chat format (role + content only).
        
        Args:
            session_id: Session identifier
            
        Returns:
            List of messages in OpenAI format
        """
        history = self.memory.get(session_id, [])
        
        # Convert to OpenAI format (remove model field, keep only role + content)
        return [
            {
                "role": msg["role"],
                "content": msg["content"]
            }
            for msg in history
        ]
    
    def clear_session(self, session_id: str):
        """
        Clear all memory for a session.
        
        Args:
            session_id: Session identifier
        """
        if session_id in self.memory:
            del self.memory[session_id]
    
    def _prune_memory(self, session_id: str):
        """
        Prune memory to keep only the last N user-assistant turns.
        Ensures we don't exceed max_messages limit.
        
        Args:
            session_id: Session identifier
        """
        if session_id not in self.memory:
            return
        
        messages = self.memory[session_id]
        
        # Count user messages (each user message = 1 turn)
        user_count = sum(1 for msg in messages if msg["role"] == "user")
        
        # If we exceed max_turns, remove oldest messages
        if user_count > self.max_turns:
            # Keep only the last max_turns user messages and their responses
            kept_messages = []
            user_seen = 0
            
            # Iterate backwards to keep recent messages
            for msg in reversed(messages):
                if msg["role"] == "user":
                    user_seen += 1
                    if user_seen <= self.max_turns:
                        kept_messages.insert(0, msg)
                    else:
                        break
                else:
                    # Keep assistant messages that belong to kept user messages
                    if user_seen <= self.max_turns:
                        kept_messages.insert(0, msg)
            
            self.memory[session_id] = kept_messages
        
        # Also enforce absolute message limit as safety
        if len(messages) > self.max_messages:
            self.memory[session_id] = messages[-self.max_messages:]




