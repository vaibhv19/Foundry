# Phase 04 — LLM Adapter & Provider Abstraction

## Phase Goal
The objective of this phase is to construct a clean, decoupled abstraction layer for AI services. We will define a standard `LLMService` interface and implement the `GeminiProvider` as the primary engine. This module will manage API authentication, normalize provider errors into generic application exceptions, handle transient connection retries with exponential backoff, and support structured Pydantic response parsing and token estimation.

## Why This Phase Comes Now
The LLM adapter and provider abstraction must be operational and tested before they can be orchestrated by the multi-agent graph runtime.

---

## Folder Structure

```text
backend/
├── requirements.txt           # Added google-generativeai, tenacity, pydantic
└── foundry_backend/
    ├── settings.py            # API keys and default models loaded from env
    └── ai_engine/             # Core AI Integration Package
        ├── __init__.py
        ├── exceptions.py      # Standardized exception classes
        ├── service.py         # LLMService base class interface
        ├── providers/
        │   ├── __init__.py
        │   └── gemini.py      # GeminiProvider implementation
        └── tests/
            ├── __init__.py
            ├── test_exceptions.py
            └── test_gemini_provider.py
```

---

## Module Definitions

### 1. Unified LLM Interface (`LLMService`)
* **Purpose**: Defines public methods for interacting with LLM models.
* **Responsibilities**: Establishing a strict protocol for text generation, streaming, token counting, and structured JSON generation.
* **Dependencies**: None.
* **Inputs**: Query prompt strings, optional system instructions, temperature values.
* **Outputs**: Response strings, token streams, or validated Pydantic model objects.
* **Public Interfaces**:
  * `generate(prompt, system_instruction, options)`
  * `generate_stream(prompt, system_instruction, options)`
  * `generate_structured(prompt, output_schema, system_instruction)`
  * `count_tokens(text)`

### 2. Gemini Provider Adapter (`GeminiProvider`)
* **Purpose**: Concrete SDK connector to the Gemini API.
* **Responsibilities**: Mapping LLMService calls onto `google-generativeai` client calls, handling configuration tokens, and converting model output.
* **Dependencies**: Google GenAI Python library, environment configurations.
* **Public Interfaces**: Extends `LLMService`.

### 3. Resilience and Error Normalization Layer
* **Purpose**: Wraps LLM requests in transaction filters.
* **Responsibilities**: Applying `tenacity`-based retry logic for rate limits and server hiccups, catching vendor-specific errors, and converting them to uniform local exceptions.
* **Dependencies**: `tenacity`.
* **Public Interfaces**: Custom exceptions (`LLMTimeoutError`, `LLMRateLimitError`, `LLMServiceUnavailableError`, `LLMInvalidResponseError`).

---

## Shared Components & Configurations
* **API Settings**:
  ```python
  GEMINI_API_KEY = env('GEMINI_API_KEY')
  GEMINI_DEFAULT_MODEL = env('GEMINI_DEFAULT_MODEL', default='gemini-1.5-flash')
  ```
* **Application Exceptions**:
  * `LLMError(Exception)`: Base runtime exception.
  * `LLMTimeoutError(LLMError)`: Raised when api times out.
  * `LLMRateLimitError(LLMError)`: Raised on HTTP 429.
  * `LLMServiceUnavailableError(LLMError)`: Raised on HTTP 503.
  * `LLMInvalidResponseError(LLMError)`: Raised when LLM output violates schema requirements.

---

## Atomic Implementation Tasks

### Task 4.1: Add SDK and Utility Packages
* **Size**: XS
* **Risk**: Low
* **Prerequisites**: Task 2.1
* **Description**: Add `google-generativeai`, `pydantic>=2.0`, and `tenacity` packages to the `backend/requirements.txt` file and run installation.
* **Definition of Done**: Library bundles are accessible in virtualenv imports.

### Task 4.2: Declare Custom Exception Classes
* **Size**: XS
* **Risk**: Low
* **Prerequisites**: Task 4.1
* **Description**: Create file `foundry_backend/ai_engine/exceptions.py`. Write hierarchy of custom exceptions inheriting from `LLMError` to represent timeouts, rate limits, server outages, and structural validation failures.
* **Definition of Done**: Exceptions defined and testable in Python.

### Task 4.3: Define Base LLMService Interface
* **Size**: XS
* **Risk**: Low
* **Prerequisites**: Task 4.2
* **Description**: Write `LLMService` abstract class in `foundry_backend/ai_engine/service.py`. Implement `@abstractmethod` decorators for standard, streaming, and structured schema generation.
* **Definition of Done**: Abstract interface methods defined.

### Task 4.4: Implement Gemini Provider - Standard and Streaming Responses
* **Size**: M
* **Risk**: Medium
* **Prerequisites**: Task 4.3
* **Description**: Create `GeminiProvider` class in `foundry_backend/ai_engine/providers/gemini.py`. Initialize the `google-generativeai` client using the key from `settings.py`. Map text generation and token streaming methods to use `GenerativeModel.generate_content(..., stream=True/False)`.
* **Definition of Done**: 
  - Standard string returns are functional.
  - Streaming returns yield text tokens sequentially.

### Task 4.5: Implement Gemini Provider - Structured Outputs
* **Size**: M
* **Risk**: Medium
* **Prerequisites**: Task 4.4
* **Description**: Implement structured JSON extraction inside `GeminiProvider` using Gemini schemas or Pydantic validation wrapper. When calling `generate_structured(..., output_schema: Type[BaseModel])`, pass schema details into the model generation config to force structured JSON output, then parse and return the validated Pydantic object. If parsing fails, raise `LLMInvalidResponseError`.
* **Definition of Done**: Method parses text output directly into Pydantic models matching target schema definitions.

### Task 4.6: Implement Tenacity Retry Decorators and Timeout Handling
* **Size**: S
* **Risk**: Medium
* **Prerequisites**: Task 4.5
* **Description**: Configure tenacity policies to intercept Gemini network errors. Retry up to 3 times with exponential backoff on rate limits or server connection failures. Apply execution timeouts (e.g. 30 seconds limit).
* **Definition of Done**: Network call timeouts are caught and retried automatically.

### Task 4.7: Write Mocked Unit Tests for AI Engine
* **Size**: S
* **Risk**: Low
* **Prerequisites**: Task 4.6
* **Description**: Write pytest unit tests using `unittest.mock` to mock the Gemini SDK:
  - Verify that standard calls return mocked text.
  - Verify that structured requests parse into correct Pydantic instances.
  - Verify that exceptions are correctly converted (e.g. catching API exceptions and raising `LLMRateLimitError`).
* **Definition of Done**: Tests verify provider abstraction behaves predictably without making external network calls.

---

## Milestone Verification Checkpoint (Milestone 02-A)
* **Status**: Running suite.
* **Behavior**: Developer can call the AI client interface locally via script and receive standard text, token iterators, and validated Pydantic model objects.
* **Incomplete Features**: No LangGraph state machine, no background task workers.

---

## Developer Validation Checklist
- [ ] Gemini API key and model variables load correctly from environment config.
- [ ] Base `LLMService` abstract methods throw validation errors if calling unimplemented classes.
- [ ] Custom exceptions (`LLMRateLimitError`, `LLMTimeoutError`, etc.) correctly translate from Gemini API SDK exceptions.
- [ ] `GeminiProvider` successfully returns mock text generation responses.
- [ ] `GeminiProvider` token streaming yields chunks sequentially without exception.
- [ ] Structured JSON output matches target Pydantic schema validation envelopes.
- [ ] Tenacity retry rules successfully execute exponential backoff retries on transient errors.
- [ ] Pytest suite runs and passes mock provider unit tests.

---

## Git Workflow

```text
Feature Branch
      ↓
   Develop
      ↓
   Testing
      ↓
    Main
```

* **Suggested Branch Name**: `feat/ai/llm-provider`
* **Suggested Merge Point**: `develop`
* **Suggested Tag**: `v1.0.0-phase04`
* **Suggested Commit Grouping**:
  - `feat/ai/exceptions`: Exception definitions
  - `feat/ai/interface-service`: LLMService abstract interface classes
  - `feat/ai/gemini-provider`: Base Gemini SDK implementation
  - `feat/ai/structured-gemini`: Structured Pydantic extraction
  - `feat/ai/retry-resilience`: Retry policies and error translation
  - `test/ai/mock-gemini`: Unit test suite covering retry loops and mock interfaces

---

## Suggested GitHub Issues
* **Issue #2.1**: Write base `LLMService` interface & create `GeminiProvider` implementation.
* **Issue #2.2**: Implement structured JSON parsing, timeouts, and fallback retry wrappers.

---

## Learning Document
* **[04_LLM_Service_And_Provider_Abstraction.md](file:///d:/Coding/Projects----For%20Resume/Foundry/Docs/Learning/04_LLM_Service_And_Provider_Abstraction.md)**: Detail Gemini API configuration, JSON schema enforcement, and fallback recovery. After completing this phase, document the provider abstraction patterns, exception translation mappings, and structured generation validation checks.
