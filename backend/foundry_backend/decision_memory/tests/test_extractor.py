import pytest
from unittest.mock import MagicMock, patch
from foundry_backend.decision_memory.extractor import DecisionExtractor
from foundry_backend.decision_memory.schemas import DecisionExtractionResult, DecisionSchema

@patch('foundry_backend.ai_engine.providers.gemini.GeminiProvider.generate_structured')
def test_decision_extractor(mock_gen_struct):
    mock_result = DecisionExtractionResult(decisions=[
        DecisionSchema(
            decision_key="database",
            choice_value="PostgreSQL",
            rationale="Robust transactions",
            category="TECH_STACK",
            priority="P0"
        )
    ])
    mock_gen_struct.return_value = mock_result

    res = DecisionExtractor.extract_decisions_from_text("Dummy text", "Tech_Lead")
    assert len(res) == 1
    assert res[0]["decision_key"] == "database"
    assert res[0]["choice_value"] == "PostgreSQL"
    assert res[0]["node_origin"] == "Tech_Lead"
