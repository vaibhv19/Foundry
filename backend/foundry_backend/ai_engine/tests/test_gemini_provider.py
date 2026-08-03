import pytest
from unittest.mock import MagicMock, patch
from pydantic import BaseModel
from google.api_core.exceptions import ResourceExhausted, ServiceUnavailable, DeadlineExceeded

from foundry_backend.ai_engine.providers.gemini import GeminiProvider
from foundry_backend.ai_engine.exceptions import (
    LLMError, LLMTimeoutError, LLMRateLimitError,
    LLMServiceUnavailableError, LLMInvalidResponseError
)

# Mock schema for structured generation
class MockSchema(BaseModel):
    name: str
    score: int


@pytest.fixture
def mock_genai_model():
    with patch('google.generativeai.GenerativeModel') as mock_class:
        mock_instance = MagicMock()
        mock_class.return_value = mock_instance
        yield mock_instance


def test_provider_generate(mock_genai_model):
    # Mock text output
    mock_response = MagicMock()
    mock_response.text = "Hello from mock Gemini!"
    mock_genai_model.generate_content.return_value = mock_response

    provider = GeminiProvider()
    res = provider.generate("Say hello")
    assert res == "Hello from mock Gemini!"
    mock_genai_model.generate_content.assert_called_once()


def test_provider_generate_stream(mock_genai_model):
    # Mock stream output
    chunk1 = MagicMock()
    chunk1.text = "Hello "
    chunk2 = MagicMock()
    chunk2.text = "world!"
    mock_genai_model.generate_content.return_value = [chunk1, chunk2]

    provider = GeminiProvider()
    stream = provider.generate_stream("Stream test")
    res = "".join(stream)
    assert res == "Hello world!"
    mock_genai_model.generate_content.assert_called_once()


def test_provider_generate_structured_success(mock_genai_model):
    # Mock JSON output matching the Pydantic schema
    mock_response = MagicMock()
    mock_response.text = '{"name": "Alice", "score": 95}'
    mock_genai_model.generate_content.return_value = mock_response

    provider = GeminiProvider()
    res = provider.generate_structured("Get score details", MockSchema)
    
    assert isinstance(res, MockSchema)
    assert res.name == "Alice"
    assert res.score == 95


def test_provider_generate_structured_validation_failure(mock_genai_model):
    # Mock invalid JSON output
    mock_response = MagicMock()
    mock_response.text = '{"invalid_field": "oops"}'
    mock_genai_model.generate_content.return_value = mock_response

    provider = GeminiProvider()
    with pytest.raises(LLMInvalidResponseError):
        provider.generate_structured("Get score details", MockSchema)


def test_provider_exception_rate_limit(mock_genai_model):
    # Mock Google SDK raising rate limit error
    mock_genai_model.generate_content.side_effect = ResourceExhausted("API rate limit exceeded")

    provider = GeminiProvider()
    with pytest.raises(LLMRateLimitError):
        provider.generate("Test rate limit")


def test_provider_exception_service_unavailable(mock_genai_model):
    # Mock Google SDK raising service unavailable error
    mock_genai_model.generate_content.side_effect = ServiceUnavailable("Service is down")

    provider = GeminiProvider()
    with pytest.raises(LLMServiceUnavailableError):
        provider.generate("Test service down")


def test_provider_exception_timeout(mock_genai_model):
    # Mock Google SDK raising deadline exceeded error
    mock_genai_model.generate_content.side_effect = DeadlineExceeded("Timeout exceeded")

    provider = GeminiProvider()
    with pytest.raises(LLMTimeoutError):
        provider.generate("Test timeout")


def test_provider_count_tokens(mock_genai_model):
    # Mock token count response
    mock_token_response = MagicMock()
    mock_token_response.total_tokens = 42
    mock_genai_model.count_tokens.return_value = mock_token_response

    provider = GeminiProvider()
    tokens = provider.count_tokens("Count these tokens")
    assert tokens == 42
    mock_genai_model.count_tokens.assert_called_once_with("Count these tokens")
