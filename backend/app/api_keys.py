"""
NERVA API Key Manager — Rotates through multiple API keys on failure.

Supports multiple Gemini keys via comma-separated GEMINI_API_KEYS env var.
When one key is rate-limited or expired, automatically tries the next one.
"""
import os
import logging
import time
from typing import List, Optional, Tuple

logger = logging.getLogger(__name__)


class APIKeyManager:
    """
    Manages multiple API keys with automatic rotation on failure.

    Keys that fail are temporarily "cooled down" for a configurable period
    before being retried. This prevents hammering expired keys repeatedly.
    """

    def __init__(self, cooldown_seconds: int = 60):
        """
        Args:
            cooldown_seconds: How long (in seconds) to avoid a failed key before retrying it.
        """
        self.cooldown_seconds = cooldown_seconds
        self._gemini_keys: List[str] = []
        self._openai_keys: List[str] = []
        self._deepseek_keys: List[str] = []
        # Tracks failed keys: { key_hash: timestamp_of_failure }
        self._failed_keys: dict = {}
        self._current_gemini_index = 0
        self._current_openai_index = 0
        self._current_deepseek_index = 0

        self._load_keys()

    def _load_keys(self):
        """Load API keys from environment variables. Supports comma-separated lists."""
        # Load Gemini keys (comma-separated)
        gemini_keys_str = os.getenv("GEMINI_API_KEYS", "")
        if gemini_keys_str:
            self._gemini_keys = [k.strip() for k in gemini_keys_str.split(",") if k.strip()]

        # Fallback: also check the single GEMINI_API_KEY var
        single_gemini = os.getenv("GEMINI_API_KEY", "")
        if single_gemini and single_gemini not in self._gemini_keys:
            self._gemini_keys.insert(0, single_gemini)

        # Load OpenAI keys (comma-separated)
        openai_keys_str = os.getenv("OPENAI_API_KEYS", "")
        if openai_keys_str:
            self._openai_keys = [k.strip() for k in openai_keys_str.split(",") if k.strip()]

        single_openai = os.getenv("OPENAI_API_KEY", "")
        if single_openai and single_openai not in self._openai_keys:
            self._openai_keys.insert(0, single_openai)

        # Load Deepseek keys (comma-separated)
        deepseek_keys_str = os.getenv("DEEPSEEK_API_KEYS", "")
        if deepseek_keys_str:
            self._deepseek_keys = [k.strip() for k in deepseek_keys_str.split(",") if k.strip()]
            
        single_deepseek = os.getenv("DEEPSEEK_API_KEY", "")
        if single_deepseek and single_deepseek not in self._deepseek_keys:
            self._deepseek_keys.insert(0, single_deepseek)

        logger.info(
            f"API Key Manager loaded: {len(self._gemini_keys)} Gemini key(s), "
            f"{len(self._deepseek_keys)} Deepseek key(s), "
            f"{len(self._openai_keys)} OpenAI key(s)"
        )

    def _key_hash(self, key: str) -> str:
        """Short hash for logging (never log the full key)."""
        return f"...{key[-6:]}" if len(key) > 6 else "***"

    def _is_cooled_down(self, key: str) -> bool:
        """Check if a previously failed key has served its cooldown period."""
        fail_time = self._failed_keys.get(key)
        if fail_time is None:
            return True  # Never failed, good to use
        return (time.time() - fail_time) >= self.cooldown_seconds

    def mark_key_failed(self, key: str):
        """Mark a key as failed — it will be skipped until cooldown expires."""
        self._failed_keys[key] = time.time()
        logger.warning(f"API key {self._key_hash(key)} marked as failed. Cooling down for {self.cooldown_seconds}s.")

    def mark_key_success(self, key: str):
        """Clear failure status for a key that worked."""
        if key in self._failed_keys:
            del self._failed_keys[key]

    def get_available_gemini_keys(self) -> List[str]:
        """Get all Gemini keys that are not currently in cooldown."""
        return [k for k in self._gemini_keys if self._is_cooled_down(k)]

    def get_available_openai_keys(self) -> List[str]:
        """Get all OpenAI keys that are not currently in cooldown."""
        return [k for k in self._openai_keys if self._is_cooled_down(k)]

    def get_available_deepseek_keys(self) -> List[str]:
        """Get all Deepseek keys that are not currently in cooldown."""
        return [k for k in self._deepseek_keys if self._is_cooled_down(k)]

    def get_next_key(self) -> Optional[Tuple[str, str, str]]:
        """
        Get the next available API key to try.

        Returns:
            Tuple of (provider, model, api_key), or None if no keys are available.
            Provider is "gemini" or "openai".
        """
        # Try Gemini keys first (round-robin among available)
        available_gemini = self.get_available_gemini_keys()
        if available_gemini:
            key = available_gemini[self._current_gemini_index % len(available_gemini)]
            self._current_gemini_index = (self._current_gemini_index + 1) % len(available_gemini)
            return ("gemini", "gemini/gemini-2.0-flash", key)

        # Try Deepseek keys next
        available_deepseek = self.get_available_deepseek_keys()
        if available_deepseek:
            key = available_deepseek[self._current_deepseek_index % len(available_deepseek)]
            self._current_deepseek_index = (self._current_deepseek_index + 1) % len(available_deepseek)
            return ("deepseek", "deepseek/deepseek-chat", key)

        # Fallback to OpenAI
        available_openai = self.get_available_openai_keys()
        if available_openai:
            key = available_openai[self._current_openai_index % len(available_openai)]
            self._current_openai_index = (self._current_openai_index + 1) % len(available_openai)
            return ("openai", "gpt-4o-mini", key)

        return None

    def get_all_keys_to_try(self) -> List[Tuple[str, str, str]]:
        """
        Get ALL available keys in priority order for a full retry sequence.
        Gemini keys first, then OpenAI keys.

        Returns:
            List of (provider, model, api_key) tuples.
        """
        keys = []

        # All available Gemini keys
        for key in self._gemini_keys:
            if self._is_cooled_down(key):
                keys.append(("gemini", "gemini/gemini-2.0-flash", key))
                
        # All available Deepseek keys
        for key in self._deepseek_keys:
            if self._is_cooled_down(key):
                keys.append(("deepseek", "deepseek/deepseek-chat", key))

        # All available OpenAI keys
        for key in self._openai_keys:
            if self._is_cooled_down(key):
                keys.append(("openai", "gpt-4o-mini", key))

        return keys

    @property
    def total_keys(self) -> int:
        return len(self._gemini_keys) + len(self._openai_keys) + len(self._deepseek_keys)

    @property
    def available_keys_count(self) -> int:
        return len(self.get_available_gemini_keys()) + len(self.get_available_openai_keys()) + len(self.get_available_deepseek_keys())

    def status(self) -> dict:
        """Return a status summary (safe for logging/API responses)."""
        return {
            "gemini_keys_total": len(self._gemini_keys),
            "gemini_keys_available": len(self.get_available_gemini_keys()),
            "deepseek_keys_total": len(self._deepseek_keys),
            "deepseek_keys_available": len(self.get_available_deepseek_keys()),
            "openai_keys_total": len(self._openai_keys),
            "openai_keys_available": len(self.get_available_openai_keys()),
            "cooldown_seconds": self.cooldown_seconds,
            "failed_keys_count": len(self._failed_keys),
        }


# Singleton instance
key_manager = APIKeyManager(cooldown_seconds=60)
