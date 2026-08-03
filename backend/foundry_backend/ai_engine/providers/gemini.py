import google.generativeai as genai
from django.conf import settings
from typing import Any, Dict, Generator, Optional, Type
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from google.api_core.exceptions import ResourceExhausted, ServiceUnavailable, DeadlineExceeded, GoogleAPICallError

from ..service import LLMService
from ..exceptions import (
    LLMError, LLMTimeoutError, LLMRateLimitError,
    LLMServiceUnavailableError, LLMInvalidResponseError
)

if getattr(settings, 'GEMINI_API_KEY', None):
    genai.configure(api_key=settings.GEMINI_API_KEY)

class GeminiProvider(LLMService):
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or getattr(settings, 'GEMINI_DEFAULT_MODEL', 'gemini-1.5-flash')
        self.model = genai.GenerativeModel(self.model_name)

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((ResourceExhausted, ServiceUnavailable, DeadlineExceeded))
    )
    def _execute_generate(self, prompt: str, system_instruction: Optional[str] = None, generation_config: Optional[Dict[str, Any]] = None) -> Any:
        if system_instruction:
            model = genai.GenerativeModel(
                self.model_name,
                system_instruction=system_instruction
            )
        else:
            model = self.model

        return model.generate_content(
            prompt,
            generation_config=generation_config,
            request_options={"timeout": 30}
        )

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((ResourceExhausted, ServiceUnavailable, DeadlineExceeded))
    )
    def _execute_generate_stream(self, prompt: str, system_instruction: Optional[str] = None, generation_config: Optional[Dict[str, Any]] = None) -> Any:
        if system_instruction:
            model = genai.GenerativeModel(
                self.model_name,
                system_instruction=system_instruction
            )
        else:
            model = self.model

        return model.generate_content(
            prompt,
            generation_config=generation_config,
            stream=True,
            request_options={"timeout": 30}
        )

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> str:
        generation_config = {}
        if options:
            generation_config.update(options)

        try:
            response = self._execute_generate(prompt, system_instruction, generation_config)
            return response.text
        except ResourceExhausted as e:
            raise LLMRateLimitError(f"Rate limit exceeded: {e}")
        except ServiceUnavailable as e:
            raise LLMServiceUnavailableError(f"Service unavailable: {e}")
        except DeadlineExceeded as e:
            raise LLMTimeoutError(f"Request timed out: {e}")
        except GoogleAPICallError as e:
            raise LLMError(f"Gemini API call error: {e}")
        except Exception as e:
            raise LLMError(f"Unexpected error: {e}")

    def generate_stream(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Generator[str, None, None]:
        generation_config = {}
        if options:
            generation_config.update(options)

        try:
            response = self._execute_generate_stream(prompt, system_instruction, generation_config)
            for chunk in response:
                yield chunk.text
        except ResourceExhausted as e:
            raise LLMRateLimitError(f"Rate limit exceeded: {e}")
        except ServiceUnavailable as e:
            raise LLMServiceUnavailableError(f"Service unavailable: {e}")
        except DeadlineExceeded as e:
            raise LLMTimeoutError(f"Request timed out: {e}")
        except GoogleAPICallError as e:
            raise LLMError(f"Gemini API call error: {e}")
        except Exception as e:
            raise LLMError(f"Unexpected error: {e}")

    def generate_structured(
        self,
        prompt: str,
        output_schema: Type[BaseModel],
        system_instruction: Optional[str] = None
    ) -> BaseModel:
        generation_config = {
            "response_mime_type": "application/json"
        }

        try:
            schema_dict = output_schema.model_json_schema()
        except AttributeError:
            schema_dict = output_schema.schema()

        enhanced_prompt = f"{prompt}\n\nYou MUST return output strictly matching this JSON schema:\n{schema_dict}"

        try:
            response_text = self.generate(enhanced_prompt, system_instruction, generation_config)
            try:
                return output_schema.model_validate_json(response_text)
            except AttributeError:
                return output_schema.parse_raw(response_text)
        except (LLMError, LLMRateLimitError, LLMTimeoutError, LLMServiceUnavailableError):
            raise
        except Exception as e:
            raise LLMInvalidResponseError(f"Failed to validate response against schema: {e}")

    def count_tokens(self, text: str) -> int:
        try:
            return self.model.count_tokens(text).total_tokens
        except Exception as e:
            raise LLMError(f"Failed to count tokens: {e}")
