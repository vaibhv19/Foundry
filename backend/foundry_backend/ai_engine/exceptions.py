class LLMError(Exception):
    """Base exception for all LLM service errors."""
    pass

class LLMTimeoutError(LLMError):
    """Raised when the LLM provider API request times out."""
    pass

class LLMRateLimitError(LLMError):
    """Raised when the LLM provider API responds with HTTP 429 (Rate Limit Exceeded)."""
    pass

class LLMServiceUnavailableError(LLMError):
    """Raised when the LLM provider API is unavailable (HTTP 503 or network failure)."""
    pass

class LLMInvalidResponseError(LLMError):
    """Raised when the LLM provider output is invalid or violates schema validation constraints."""
    pass
