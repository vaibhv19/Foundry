# LLM Service & Provider Abstraction

This document details the architecture, configuration, and implementation of the decoupled AI generation adapter layer for Foundry.

## 1. Decoupled AI Interface Architecture

To prevent vendor lock-in and enable seamless provider swapping (e.g., from Gemini to OpenAI or Anthropic), we established a clean abstraction layer:

```text
               +----------------------+
               |      LLMService      |  (Abstract Base Class Contract)
               +----------+-----------+
                          |
                          ▲ (Inherits)
                          |
               +----------+-----------+
               |    GeminiProvider    |  (Concrete Google GenAI Client)
               +----------------------+
```

-   **`LLMService`** (`foundry_backend/ai_engine/service.py`): The base abstract class defining core interface methods:
    -   `generate()`: Complete text generations.
    -   `generate_stream()`: Sequential token chunk yields.
    -   `generate_structured()`: Pydantic-validated JSON extraction.
    -   `count_tokens()`: Token calculation.

---

## 2. Gemini API Configuration

Authentication and default model settings are configured globally in Django `settings.py` using `django-environ`:

```python
GEMINI_API_KEY = env('GEMINI_API_KEY', default='')
GEMINI_DEFAULT_MODEL = env('GEMINI_DEFAULT_MODEL', default='gemini-1.5-flash')
```

The `google-generativeai` SDK client is configured globally at package import time using the setting value:
`genai.configure(api_key=settings.GEMINI_API_KEY)`

---

## 3. Resilience and Error Normalization

To isolate vendor-specific errors from the rest of the application, we catch and normalize standard API client errors into uniform, locally-defined exceptions.

### Exception Mapping Table

| Source Google API Exception | Normalized Application Exception | Description |
| :--- | :--- | :--- |
| `ResourceExhausted` (429) | `LLMRateLimitError` | Rate limits exceeded. |
| `ServiceUnavailable` (503) | `LLMServiceUnavailableError` | Server down or network issues. |
| `DeadlineExceeded` (408) | `LLMTimeoutError` | Request execution timed out. |
| Validation errors / Bad JSON | `LLMInvalidResponseError` | Response violates structured Pydantic schemas. |
| `GoogleAPICallError` / Other | `LLMError` | Generic fallback exception. |

### Retry and Backoff Policies

We use the `tenacity` library to configure retry decorators on standard and streaming network actions:
-   **Max Attempts**: 3 retries.
-   **Backoff Strategy**: Exponential backoff (`multiplier=1, min=2, max=10`).
-   **Triggering Exceptions**: `ResourceExhausted` (rate limits), `ServiceUnavailable` (server outages), `DeadlineExceeded` (timeouts).

---

## 4. Structured JSON Output Enforcement

For agent coordination and state machines, generating structured JSON is critical.

### Enforcement Strategy

1.  **Response MIME Type**: We instruct the generative model config to restrict output to JSON:
    ```python
    generation_config = {"response_mime_type": "application/json"}
    ```
2.  **Schema Context**: We inject the JSON schema string directly into the system prompt:
    ```python
    enhanced_prompt = f"{prompt}\n\nYou MUST return output strictly matching this JSON schema:\n{schema_dict}"
    ```
3.  **Pydantic Validation**: The resulting string is parsed and validated directly using `output_schema.model_validate_json()` (with backward compatibility fallbacks), returning a strongly typed Pydantic instance or raising `LLMInvalidResponseError` on schema violations.
