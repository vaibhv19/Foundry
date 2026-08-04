from foundry_backend.ai_engine.providers.gemini import GeminiProvider
from .schemas import DecisionExtractionResult

DECISION_EXTRACTION_PROMPT = """You are the Decision Log Extractor in Foundry.
Your task is to parse raw agent debate text and extract concrete, durable design or business commitments.
Apply the "Commitment Test":
- Identify durable design choices or specifications, not casual or temporary thoughts.
- Reject stylistic or temporary commentary.
- Group decisions into category matching: MARKET, PRODUCT, TECH_STACK, or BUSINESS.
- Assign a priority rating: P0, P1, or P2.

Input text to parse:
{text}
"""

class DecisionExtractor:
    @staticmethod
    def extract_decisions_from_text(text: str, node_origin: str) -> list:
        provider = GeminiProvider()
        prompt = DECISION_EXTRACTION_PROMPT.format(text=text)

        result = provider.generate_structured(prompt, DecisionExtractionResult)

        decisions_list = []
        for decision in result.decisions:
            dec_dict = decision.model_dump() if hasattr(decision, 'model_dump') else decision.dict()
            dec_dict['node_origin'] = node_origin
            decisions_list.append(dec_dict)

        return decisions_list
