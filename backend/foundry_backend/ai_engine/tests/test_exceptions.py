from foundry_backend.ai_engine.exceptions import (
    LLMError, LLMTimeoutError, LLMRateLimitError,
    LLMServiceUnavailableError, LLMInvalidResponseError
)

def test_exceptions_inheritance():
    assert issubclass(LLMTimeoutError, LLMError)
    assert issubclass(LLMRateLimitError, LLMError)
    assert issubclass(LLMServiceUnavailableError, LLMError)
    assert issubclass(LLMInvalidResponseError, LLMError)
    assert issubclass(LLMError, Exception)
