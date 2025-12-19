from typing import List, Dict, Optional
from collections import defaultdict
import time

class SessionMemory:
    """
    Manages session-based conversation memory with automatic pruning.
    
    Structure:
    {
        session_id: [
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": "..."}
        ]
    }
    """
    def __init__(self, max_turns: int = 10):
        self.memory: Dict[str, List[Dict]] = defaultdict(list)
        self.max_turns = max_turns  # Max number of user-assistant pairs
        
    def add_user_message(self, session_id: str, content: str):
        """Add a user message to the session."""
        self.memory[session_id].append({
            "role": "user",
            "content": content
        })
        self._prune_history(session_id)
        
    def add_assistant_message(self, session_id: str, content: str):
        """Add an assistant message to the session."""
        self.memory[session_id].append({
            "role": "assistant",
            "content": content
        })
        self._prune_history(session_id)
    
    def get_history(self, session_id: str) -> List[Dict]:
        """Get the full conversation history for a session."""
        return self.memory.get(session_id, [])

    def _prune_history(self, session_id: str):
        """
        Keep history within limits.
        If we have more than max_turns * 2 messages, remove the oldest ones.
        Always try to keep 'system' message if we had one (not implemented here but good practice).
        For now, strictly FIFO with a cap.
        """
        history = self.memory[session_id]
        if len(history) > self.max_turns * 2:
            # simple slicing to keep last N messages
            self.memory[session_id] = history[-(self.max_turns * 2):]

# Global instance
session_store = SessionMemory()
