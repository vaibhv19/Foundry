from pydantic import BaseModel, Field
from typing import List

class DecisionSchema(BaseModel):
    decision_key: str = Field(description="Normalized slug representation of choice")
    choice_value: str = Field(description="The concrete framework/technology/value selected")
    rationale: str = Field(description="The architectural or business reasoning why this was chosen")
    category: str = Field(description="One of: MARKET, PRODUCT, TECH_STACK, BUSINESS")
    priority: str = Field(description="P0, P1, or P2 priority rating")

class DecisionExtractionResult(BaseModel):
    decisions: List[DecisionSchema] = Field(default=[], description="List of extracted durable choices")
